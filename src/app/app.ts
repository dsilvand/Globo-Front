import { Component, HostListener, OnInit, NgZone, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastComponent } from './components/toast/toast.component';
import { ApiService } from './services/api';
import { ToastService } from './services/toast.service';
import { SoundService } from './services/sound.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'globo-monitor-front';
  isAiActive = true;
  
  // Controle para o Polling Global
  private refreshInterval: any;
  private lastOccurrenceId: number | null = null;

  constructor(
    private api: ApiService, 
    private toast: ToastService,
    private soundService: SoundService,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    // 1. Ouvido do WebSocket (Tempo Real Instantâneo)
    this.api.onNewOccurrence().subscribe((data) => {
      this.handleNewAlert(data.id);
    });

    // 2. Ouvido do Polling (Plano B - "F5 Automático")
    // Verifica a cada 3 segundos se tem algo novo no banco
    this.ngZone.runOutsideAngular(() => {
      this.refreshInterval = setInterval(() => {
        this.checkForNewData();
      }, 3000);
    });
  }

  // Verifica no banco se a última ocorrência mudou
  checkForNewData() {
    this.api.getRecentOccurrences().subscribe(list => {
      if (list && list.length > 0) {
        const latestId = list[0].id;
        // Se o ID for maior que o último que vimos, é novo!
        if (this.lastOccurrenceId !== null && latestId > this.lastOccurrenceId) {
           this.ngZone.run(() => this.handleNewAlert(latestId));
        }
        // Atualiza o cache do ID
        this.lastOccurrenceId = latestId;
      }
    });
  }

  handleNewAlert(id: number) {
    // Evita bipar duas vezes (se o Socket e o Polling pegarem ao mesmo tempo)
    if (this.lastOccurrenceId === id) return;
    
    this.lastOccurrenceId = id;
    this.soundService.playBeep();
    
    // Opcional: Mostrar um toast rápido se não estiver na tela de monitor
    if (!window.location.pathname.includes('/monitor')) {
        this.toast.show('Nova ocorrência detectada!', 'info');
    }
  }

  @HostListener('document:click')
  unlockAudioGlobal() {
    this.soundService.unlockAudio();
  }

  toggleAiStatus() {
    const newState = !this.isAiActive;
    this.api.toggleAIProcessing(newState).subscribe({
      next: () => {
        this.isAiActive = newState;
        const msg = newState ? 'ATIVADO' : 'PAUSADO';
        const type = newState ? 'success' : 'info';
        this.toast.show(`Processamento de IA ${msg}`, type);
      },
      error: () => {
        this.isAiActive = newState; 
        this.toast.show(`[SIMULAÇÃO] IA ${newState ? 'ATIVADO' : 'PAUSADO'}`, 'info');
      }
    });
  }

  ngOnDestroy() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }
}