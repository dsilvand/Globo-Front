import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
import { OccurrenceDetailsComponent } from '../../components/occurrence-details/occurrence-details';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule, OccurrenceDetailsComponent],
  templateUrl: './history.html',
  styleUrls: ['./history.scss']
})
export class HistoryComponent implements OnInit {
  // Filtros vinculados aos inputs do HTML
  filters: any = { 
    start_date: '', 
    end_date: '', 
    status: '' 
  };
  
  historyData: any[] = [];
  selectedOccurrenceId: number | null = null; // Controle do Modal
  
  // Paginação
  page = 1;
  pageSize = 20;
  total = 0;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.api.getHistory(this.filters, this.page, this.pageSize).subscribe({
      next: (res) => {
        this.historyData = res.data;
        this.total = res.total;
      },
      error: (err) => console.error('Erro ao carregar histórico', err)
    });
  }

  // --- Ações da Tabela ---

  approve(id: number) {
    if(!confirm('Deseja realmente aprovar esta ocorrência?')) return;
    
    this.api.updateStatus(id, 'Aprovado').subscribe(() => {
      this.loadData(); // Recarrega para atualizar o status na tela
    });
  }

  reject(id: number) {
    if(!confirm('Deseja realmente rejeitar esta ocorrência?')) return;

    this.api.updateStatus(id, 'Rejeitado').subscribe(() => {
      this.loadData();
    });
  }

  download(type: 'csv' | 'pdf') {
    const url = this.api.getExportUrl(type, this.filters);
    // Abre em nova aba para iniciar o download
    window.open(url, '_blank');
  }

  // --- Paginação ---

  changePage(delta: number) {
    const newPage = this.page + delta;
    if (newPage >= 1) {
      this.page = newPage;
      this.loadData();
    }
  }

  // --- Modal ---

  openDetails(id: number) {
    this.selectedOccurrenceId = id;
  }

  closeDetails() {
    this.selectedOccurrenceId = null;
  }
}