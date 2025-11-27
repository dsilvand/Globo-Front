import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-occurrence-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './occurrence-details.html',
  styleUrls: ['./occurrence-details.scss']
})
export class OccurrenceDetailsComponent implements OnChanges {
  @Input() occurrenceId: number | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() statusChanged = new EventEmitter<void>(); // <--- Novo evento

  occurrence: any = null;
  loading = false;
  processing = false; // Para desabilitar botões durante o clique

  constructor(private api: ApiService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['occurrenceId'] && this.occurrenceId) {
      this.loadDetails(this.occurrenceId);
    }
  }

  loadDetails(id: number) {
    this.loading = true;
    this.occurrence = null;
    
    this.api.getOccurrenceById(id).subscribe({
      next: (data) => {
        this.occurrence = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  // Ação de Validar (Aprovar)
  validate() {
    if (!this.occurrence) return;
    this.processing = true;
    this.api.updateStatus(this.occurrence.id, 'Aprovado').subscribe({
      next: () => {
        this.statusChanged.emit(); // Avisa o pai para atualizar a lista
        this.onClose(); // Fecha o modal
      },
      error: () => this.processing = false
    });
  }

  // Ação de Rejeitar
  reject() {
    if (!this.occurrence) return;
    this.processing = true;
    this.api.updateStatus(this.occurrence.id, 'Rejeitado').subscribe({
      next: () => {
        this.statusChanged.emit();
        this.onClose();
      },
      error: () => this.processing = false
    });
  }

  onClose() {
    this.close.emit();
    this.occurrence = null;
    this.processing = false;
  }
}