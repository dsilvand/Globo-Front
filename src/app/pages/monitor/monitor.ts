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

  // --- LÓGICA DE CONFIGURAÇÃO AJUSTADA ---

  // 1. Troca de Aba: Salva IMEDIATAMENTE (Silencioso)
  // Atende ao seu pedido: "Frontend avisa o Backend imediatamente (setMode)"
  setMode(mode: string) {
    this.settings.mode = mode;
    this.saveSettings(false); // false = sem alerta visual (feedback silencioso)
  }

  // 2. Botão Disquete: Salva com Feedback Visual
  // É a única forma de persistir alterações de texto (URL/Devices)
  saveSettings(showFeedback: boolean = true) {
    this.api.setMonitoringMode(this.settings).subscribe({
      next: (res) => {
        if(showFeedback) {
           console.log('Configurações salvas no servidor.');
           alert('Configurações salvas com sucesso!'); 
        }
        
        // Se mudou a fonte enquanto toca, reiniciamos o stream
        if(this.isPlaying) {
          this.stopStreamLocal();
        }
      },
      error: (err) => {
        if(showFeedback) alert('Erro ao salvar: ' + (err.error?.detail || 'Erro desconhecido'));
      }
    });
  }

  // 3. Iniciar Stream: NÃO FORÇA SALVAMENTO
  // Atende ao seu pedido: "transferido do INICIAR MONITORAMENTO para o novo botao disket"
  startStream() {
    this.api.startLiveStream().subscribe({
      next: (res) => {
        console.log(res.message);
        setTimeout(() => this.initPlayer(), 3000);
      },
      error: (err) => {
        console.error('Erro ao iniciar stream', err);
        // Mensagem de erro educativa
        alert('Erro ao iniciar. Se você alterou a URL, certifique-se de ter clicado no botão SALVAR antes.');
      }
    });
  }

  // --- Restante do Código (Player e Modal) ---

  openDetails(id: number) { this.selectedOccurrenceId = id; }
  closeDetails() { this.selectedOccurrenceId = null; }

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