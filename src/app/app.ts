import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastComponent } from './components/toast/toast.component'; // Importar componente

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ToastComponent], // Adicionar aos imports
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent {
  title = 'globo-monitor-front';
}