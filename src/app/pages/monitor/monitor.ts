import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
import { OccurrenceDetailsComponent } from '../../components/occurrence-details/occurrence-details';
import Hls from 'hls.js';

@Component({
  selector: 'app-monitor',
  standalone: true,
  imports: [CommonModule, FormsModule, OccurrenceDetailsComponent],
  templateUrl: './monitor.html',
  styleUrls: ['./monitor.scss']
})
export class MonitorComponent implements OnInit, OnDestroy {
  @ViewChild('videoPlayer') videoElement!: ElementRef<HTMLVideoElement>;
  
  settings: any = { mode: 'FILE', srt_url: '', video_device: '', audio_device: '' };
  videoDevices: string[] = [];
  audioDevices: string[] = [];
  
  recentOccurrences: any[] = [];
  selectedOccurrenceId: number | null = null;
  
  isPlaying = false;
  hls: Hls | null = null;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadSettings();
    this.loadDevices();
    this.loadRecent();

    this.api.onNewOccurrence().subscribe(data => {
      this.recentOccurrences.unshift(data);
      this.recentOccurrences = this.recentOccurrences.slice(0, 10);
    });

    this.api.getLiveStatus().subscribe(res => {
      if(res.running) {
        setTimeout(() => this.initPlayer(), 1000);
      }
    });
  }

  loadSettings() {
    this.api.getMonitoringMode().subscribe({
      next: (res) => {
        this.settings = { 
          mode: res.current_mode, 
          srt_url: res.srt_url || '', 
          video_device: res.video_device || '', 
          audio_device: res.audio_device || '' 
        };
      },
      error: (err) => console.error('Erro ao carregar configurações', err)
    });
  }

  loadDevices() {
    this.api.listDevices().subscribe(res => {
      this.videoDevices = res.video_devices || [];
      this.audioDevices = res.audio_devices || [];
    });
  }

  loadRecent() {
    this.api.getRecentOccurrences().subscribe(res => {
      this.recentOccurrences = (res || []).slice(0, 10);
    });
  }

  // --- Ações de Configuração ---

  // 1. Apenas troca a aba visualmente (NÃO salva automaticamente)
  setMode(mode: string) {
    this.settings.mode = mode;
  }

  // 2. Salva explicitamente ao clicar no botão discreto
  saveSettings() {
    this.api.setMonitoringMode(this.settings).subscribe({
      next: (res) => {
        console.log('Configurações salvas no servidor.');
        alert('Configurações salvas com sucesso!'); // Feedback simples
        
        // Se estiver tocando e mudou a config, paramos para forçar reinício com novos parâmetros
        if(this.isPlaying) {
          this.stopStreamLocal();
        }
      },
      error: (err) => alert('Erro ao salvar: ' + (err.error?.detail || 'Erro desconhecido'))
    });
  }

  // 3. Inicia o stream usando o que está SALVO no backend
  startStream() {
    this.api.startLiveStream().subscribe({
      next: (res) => {
        console.log(res.message);
        setTimeout(() => this.initPlayer(), 3000);
      },
      error: (err) => {
        console.error('Erro ao iniciar stream', err);
        alert('Erro ao iniciar. Verifique se salvou as configurações corretamente.');
      }
    });
  }

  // --- Controle do Modal ---

  openDetails(id: number) { this.selectedOccurrenceId = id; }
  closeDetails() { this.selectedOccurrenceId = null; }

  // --- Player HLS ---

  initPlayer() {
    if (this.hls) this.hls.destroy();
    const video = this.videoElement.nativeElement;
    const hlsUrl = 'http://localhost:8000/hls/index.m3u8'; 

    if (Hls.isSupported()) {
      this.hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      this.hls.loadSource(hlsUrl);
      this.hls.attachMedia(video);
      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(e => console.warn("Autoplay block:", e));
        this.isPlaying = true;
      });
      this.hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
           data.type === Hls.ErrorTypes.NETWORK_ERROR ? this.hls?.startLoad() : this.stopStreamLocal();
        }
      });
    } 
    else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play();
        this.isPlaying = true;
      });
    }
  }

  stopStreamLocal() {
    if (this.hls) this.hls.destroy();
    this.isPlaying = false;
  }

  ngOnDestroy() { this.stopStreamLocal(); }
}