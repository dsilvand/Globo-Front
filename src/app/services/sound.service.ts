import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SoundService {
  private audio = new Audio('assets/beep2.mp3'); // Caminho atualizado
  private audioUnlocked = false;

  // Signal: A maneira mais moderna do Angular compartilhar estado
  isMuted = signal(false);

  constructor() {
    this.audio.volume = 0.5;
  }

  playBeep() {
    // Se estiver mudo, não toca
    if (this.isMuted()) return;

    this.audio.currentTime = 0;
    this.audio.play().catch(e => {
      // Silencioso para não poluir o console se não tiver interação
    });
  }

  toggleMute() {
    // Inverte o valor (true <-> false)
    this.isMuted.update(v => !v);
    
    // Se desmutou, tenta desbloquear o áudio
    if (!this.isMuted()) this.unlockAudio();
  }

  unlockAudio() {
    if (this.audioUnlocked) return;
    
    // Toca e pausa rapidinho para "enganar" o navegador e liberar o som
    this.audio.play().then(() => {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audioUnlocked = true;
      console.log('[SoundService] Áudio desbloqueado com sucesso!');
    }).catch(() => {});
  }
}