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
  
  // Configuração Gráfico Barras (Tipos de Falha)
  public barChartOptions: ChartConfiguration['options'] = { responsive: true };
  public barChartData: ChartData<'bar'> = { labels: [], datasets: [{ data: [], label: 'Ocorrências' }] };

  // Configuração Gráfico Pizza (Níveis)
  public pieChartData: ChartData<'doughnut'> = { labels: [], datasets: [{ data: [] }] };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getDashboardSummary().subscribe(res => {
      this.summary = res;
      
      // Preencher Gráfico de Barras
      const types = res.fault_type_distribution.map((x: any) => x.type);
      const counts = res.fault_type_distribution.map((x: any) => x.count);
      this.barChartData = {
        labels: types,
        datasets: [{ data: counts, label: 'Falhas', backgroundColor: '#F47F20' }]
      };

      // Preencher Gráfico Pizza
      const levels = res.level_distribution.map((x: any) => x.level);
      const levelCounts = res.level_distribution.map((x: any) => x.count);
      this.pieChartData = {
        labels: levels,
        datasets: [{ data: levelCounts, backgroundColor: ['#F44336', '#FFC107', '#4CAF50'] }]
      };
    });
  }
}