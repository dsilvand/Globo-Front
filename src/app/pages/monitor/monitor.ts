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
  styleUrls: ['./monitor.scss'] // Certifique-se que o arquivo existe, mesmo vazio
})
export class MonitorComponent implements OnInit, OnDestroy {
  @ViewChild('videoPlayer') videoElement!: ElementRef<HTMLVideoElement>;
  
  // Configurações e Estado
  settings: any = { mode: 'FILE', srt_url: '', video_device: '', audio_device: '' };
  videoDevices: string[] = [];
  audioDevices: string[] = [];
  
  recentOccurrences: any[] = [];
  selectedOccurrenceId: number | null = null; // Controle do Modal
  
  isPlaying = false;
  hls: Hls | null = null;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadSettings();
    this.loadDevices();
    this.loadRecent(); // Carrega lista inicial

    // WebSocket: Ouve novas ocorrências em tempo real
    this.api.onNewOccurrence().subscribe(data => {
      // Adiciona a nova ocorrência no topo
      this.recentOccurrences.unshift(data);
      // Mantém apenas as 10 mais recentes na tela (conforme seu pedido)
      this.recentOccurrences = this.recentOccurrences.slice(0, 10);
    });

    // Verifica se o stream já está rodando no backend ao abrir a página
    this.api.getLiveStatus().subscribe(res => {
      if(res.running) {
        // Pequeno delay para garantir que o elemento de vídeo renderizou
        setTimeout(() => this.initPlayer(), 1000);
      }
    });
  }

  // --- Carregamento de Dados ---

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
      const allData = res || [];
      // Garante que só mostramos os 10 últimos
      this.recentOccurrences = allData.slice(0, 10);
    });
  }

  // --- Ações do Usuário ---

  saveSettings() {
    this.api.setMonitoringMode(this.settings).subscribe({
      next: (res) => {
        alert('Configurações salvas com sucesso!');
        // Se mudou o modo, paramos o player atual para forçar reinício
        if(this.isPlaying) {
          this.stopStreamLocal();
        }
      },
      error: (err) => alert('Erro ao salvar: ' + (err.error?.detail || 'Erro desconhecido'))
    });
  }

  startStream() {
    this.api.startLiveStream().subscribe({
      next: (res) => {
        console.log(res.message);
        // Aguarda 3s para o FFmpeg gerar os primeiros segmentos antes de tocar
        setTimeout(() => this.initPlayer(), 3000);
      },
      error: (err) => {
        console.error('Erro ao iniciar stream', err);
        alert('Não foi possível iniciar o stream. Verifique o backend.');
      }
    });
  }

  // --- Controle do Modal ---

  openDetails(id: number) {
    this.selectedOccurrenceId = id;
  }

  closeDetails() {
    this.selectedOccurrenceId = null;
  }

  // --- Lógica do Player (HLS) ---

  initPlayer() {
    if (this.hls) this.hls.destroy();
    
    const video = this.videoElement.nativeElement;
    const hlsUrl = 'http://localhost:8000/hls/index.m3u8'; 

    if (Hls.isSupported()) {
      this.hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      
      this.hls.loadSource(hlsUrl);
      this.hls.attachMedia(video);
      
      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(e => console.warn("Autoplay bloqueado:", e));
        this.isPlaying = true;
      });

      this.hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log("Erro de rede no stream, tentando recuperar...");
              this.hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log("Erro de mídia, recuperando...");
              this.hls?.recoverMediaError();
              break;
            default:
              this.stopStreamLocal();
              break;
          }
        }
      });
    } 
    else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Fallback para Safari
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

  ngOnDestroy() {
    this.stopStreamLocal();
  }
}