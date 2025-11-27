import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit {
  summary: any = {};
  
  // --- 1. CONFIGURAÇÃO GRÁFICO HORIZONTAL (TIPOS DE FALHA) ---
  public barChartOptions: ChartConfiguration['options'] = {
    indexAxis: 'y', // <--- MÁGICA: Vira o gráfico na horizontal
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }, // Remove legenda desnecessária
      tooltip: {
        backgroundColor: '#1E1E1E',
        titleColor: '#FFF',
        bodyColor: '#CCC',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: { color: '#333' }, // Grid vertical sutil
        ticks: { color: '#888' }
      },
      y: {
        grid: { display: false }, // Limpa linhas horizontais
        ticks: {
          color: '#E0E0E0', // Texto claro para leitura fácil
          font: { size: 11, family: 'Segoe UI' },
          autoSkip: false // Garante que todos os labels apareçam
        }
      }
    }
  };
  public barChartData: ChartData<'bar'> = { labels: [], datasets: [{ data: [], label: 'Ocorrências' }] };

  // --- 2. CONFIGURAÇÃO GRÁFICO PIZZA (SEVERIDADE) ---
  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: 20 },
    plugins: {
      legend: {
        position: 'right', // Legenda na lateral para não espremer o gráfico
        labels: { color: '#E0E0E0', boxWidth: 12, padding: 15 }
      }
    },
    elements: {
      arc: { borderWidth: 0 } // Remove borda branca padrão do ChartJS
    }
  };
  public pieChartData: ChartData<'doughnut'> = { labels: [], datasets: [{ data: [] }] };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getDashboardSummary().subscribe(res => {
      this.summary = res;
      
      // Dados Barras
      const types = res.fault_type_distribution.map((x: any) => x.type);
      const counts = res.fault_type_distribution.map((x: any) => x.count);
      this.barChartData = {
        labels: types,
        datasets: [{ 
          data: counts, 
          label: 'Falhas', 
          backgroundColor: '#F47F20',
          borderRadius: 4,
          barPercentage: 0.6 // Barras mais finas e elegantes
        }]
      };

      // Dados Pizza
      const levels = res.level_distribution.map((x: any) => x.level);
      const levelCounts = res.level_distribution.map((x: any) => x.count);
      this.pieChartData = {
        labels: levels,
        datasets: [{ 
          data: levelCounts, 
          backgroundColor: ['#D32F2F', '#FFA000', '#388E3C'], // Cores sólidas e sérias
          hoverOffset: 4
        }]
      };
    });
  }
}