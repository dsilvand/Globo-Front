import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
import { ToastService } from '../../services/toast.service';
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
  isMuted = true;
  hls: Hls | null = null;

  constructor(private api: ApiService, private toast: ToastService) {}

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

  setMode(mode: string) {
    this.settings.mode = mode;
    this.saveSettings(false);
  }

  saveSettings(showFeedback: boolean = true) {
    this.api.setMonitoringMode(this.settings).subscribe({
      next: (res) => {
        // Correção aplicada aqui: "guardadas" -> "salvas"
        if(showFeedback) this.toast.show('Configurações salvas com sucesso!', 'success');
        if(this.isPlaying) this.stopStreamLocal();
      },
      error: (err) => {
        if(showFeedback) this.toast.show('Erro ao salvar: ' + (err.error?.detail || 'Erro'), 'error');
      }
    });
  }

  startStream() {
    this.api.startLiveStream().subscribe({
      next: (res) => {
        // Correção anterior mantida: "Iniciando transmissão..."
        this.toast.show('Iniciando transmissão...', 'info');
        setTimeout(() => this.initPlayer(), 3000);
      },
      error: (err) => {
        this.toast.show('Erro ao iniciar stream. Verifique a URL.', 'error');
      }
    });
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if(this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.muted = this.isMuted;
    }
  }

  initPlayer() {
    if (this.hls) this.hls.destroy();
    const video = this.videoElement.nativeElement;
    const hlsUrl = 'http://localhost:8000/hls/index.m3u8'; 

    if (Hls.isSupported()) {
      this.hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      this.hls.loadSource(hlsUrl);
      this.hls.attachMedia(video);
      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.muted = this.isMuted;
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
    if(this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.pause();
      this.videoElement.nativeElement.removeAttribute('src');
      this.videoElement.nativeElement.load();
    }
    this.isPlaying = false;
  }

  openDetails(id: number) { this.selectedOccurrenceId = id; }
  closeDetails() { this.selectedOccurrenceId = null; }
  
  ngOnDestroy() { this.stopStreamLocal(); }
}