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
  // Filtros expandidos conforme solicitado
  filters: any = { 
    start_date: '', 
    end_date: '', 
    status: '',
    fault_type: '',    // Novo: Texto para busca do tipo
    level: '',         // Novo: Nível de severidade
    min_duration: '',  // Novo: Duração mínima
    max_duration: ''   // Novo: Duração máxima
  };
  
  historyData: any[] = [];
  selectedOccurrenceId: number | null = null;
  
  // Paginação
  page = 1;
  pageSize = 20;
  total = 0;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    // A limpeza de filtros vazios já é feita no ApiService (check keys)
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
      this.loadData();
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