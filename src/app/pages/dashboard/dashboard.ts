import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit {
  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;
  
  summary: any = {};
  activeFilter: string = 'today';
  
  // Datas Customizadas
  customStart: string = '';
  customEnd: string = '';
  
  totalOccurrences: number = 0;
  isLoading = false; // Novo estado de loading

  // --- Opções de UI para os Gráficos ---
  private commonOptions = {
    color: '#9CA3AF', // Cor padrão do texto (gray-400)
    font: { family: "'Segoe UI', 'Roboto', sans-serif", size: 11 }
  };

  public barChartOptions: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1E1E1E',
        titleColor: '#F47F20',
        bodyColor: '#E0E0E0',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: { label: (c) => ` ${c.raw} ocorrências` }
      }
    },
    scales: {
      x: { 
        grid: { color: '#333333', tickLength: 0 }, // Grid mais visível
        ticks: { color: '#9CA3AF' } // Texto mais claro
      },
      y: { 
        grid: { display: false }, 
        ticks: { color: '#F3F4F6', font: { weight: 'bold', size: 12 } } // Labels principais brancas
      }
    },
    elements: { bar: { borderRadius: 4 } }
  };

  public severityChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1E1E1E',
        titleColor: '#F47F20',
        bodyColor: '#E0E0E0',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: { 
            title: (items) => {
                const label = items[0].label as string;
                if(label.includes('Nível X')) return 'Crítico Extremo (>= 60s)';
                if(label.includes('Nível A')) return 'Alto Risco (10s - 59s)';
                if(label.includes('Nível B')) return 'Médio Risco (5s - 9s)';
                return 'Baixo Risco (<= 4s)';
            },
            label: (c) => ` ${c.raw} Falhas` 
        }
      }
    },
    scales: {
      y: { 
        grid: { color: '#333333' }, 
        ticks: { color: '#9CA3AF', stepSize: 1 } 
      },
      x: { 
        grid: { display: false }, 
        ticks: { color: '#F3F4F6', font: { weight: 'bold' } } 
      }
    },
    elements: { bar: { borderRadius: 6 } }
  };

  public barChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  public severityChartData: ChartData<'bar'> = { labels: [], datasets: [] };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.fetchData();
  }

  setFilter(range: string) {
    this.activeFilter = range;
    if (range !== 'custom') {
      this.fetchData();
    }
  }

  applyCustomFilter() {
    if (this.customStart && this.customEnd) {
      this.fetchData();
    } else {
      alert('Por favor, selecione as datas de início e fim.');
    }
  }

  fetchData() {
    this.isLoading = true;
    this.api.getDashboardSummary(this.activeFilter, this.customStart, this.customEnd).subscribe({
      next: (res) => {
        this.summary = res;
        this.totalOccurrences = (res.fault_type_distribution || []).reduce((acc: number, curr: any) => acc + curr.count, 0);
        this.updateCharts(res);
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  updateCharts(res: any) {
    // 1. Tipos de Falha
    const types = res.fault_type_distribution.map((x: any) => x.type);
    const counts = res.fault_type_distribution.map((x: any) => x.count);
    
    this.barChartData = {
      labels: types,
      datasets: [{ 
        data: counts, 
        label: 'Falhas', 
        backgroundColor: '#F47F20', // Laranja Globo
        hoverBackgroundColor: '#FF9800',
        barPercentage: 0.6,
        categoryPercentage: 0.8
      }]
    };

    // 2. Níveis de Severidade
    const severityOrder = ['C', 'B', 'A', 'X'];
    const rawData = res.level_distribution || [];
    
    // Ordenação correta
    rawData.sort((a: any, b: any) => severityOrder.indexOf(a.level) - severityOrder.indexOf(b.level));

    const mapColor = (sigla: string) => {
        switch(sigla) {
          case 'C': return '#3B82F6'; // Blue-500
          case 'B': return '#FACC15'; // Yellow-400
          case 'A': return '#F97316'; // Orange-500
          case 'X': return '#EF4444'; // Red-500
          default: return '#666';
        }
    };
    const mapLabel = (sigla: string) => {
        switch(sigla) {
          case 'C': return 'Nível C (≤4s)';
          case 'B': return 'Nível B (5-9s)';
          case 'A': return 'Nível A (10-59s)';
          case 'X': return 'Nível X (≥60s)';
          default: return sigla;
        }
    };

    this.severityChartData = {
      labels: rawData.map((x: any) => mapLabel(x.level)),
      datasets: [{ 
        data: rawData.map((x: any) => x.count), 
        backgroundColor: rawData.map((x: any) => mapColor(x.level)),
        hoverBackgroundColor: rawData.map((x: any) => mapColor(x.level) + 'DD'), // Efeito hover
        barPercentage: 0.5,
        borderRadius: 4
      }]
    };
  }
}