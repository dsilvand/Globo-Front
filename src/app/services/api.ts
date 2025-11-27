import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // URL do seu Backend Python
  private baseUrl = 'http://localhost:8000/api/v1';
  private socket: Socket;

  constructor(private http: HttpClient) {
    // Conexão WebSocket para alertas em tempo real
    this.socket = io('http://localhost:8000', {
      transports: ['websocket']
    });
  }

  // --- WebSocket ---
  onNewOccurrence(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('new_occurrence', (data) => {
        observer.next(data);
      });
    });
  }

  // --- Settings (settings.py) ---
  getMonitoringMode(): Observable<any> {
    return this.http.get(`${this.baseUrl}/settings/monitoring-mode`);
  }

  setMonitoringMode(data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/settings/monitoring-mode`, data);
  }

  listDevices(): Observable<any> {
    return this.http.get(`${this.baseUrl}/settings/devices`);
  }

  // --- Live Stream (live.py & hls_streamer.py) ---
  startLiveStream(): Observable<any> {
    return this.http.post(`${this.baseUrl}/live/start`, {});
  }

  getLiveStatus(): Observable<any> {
    return this.http.get(`${this.baseUrl}/live/status`);
  }

  // --- Ocorrências (occurrences.py) ---
  getRecentOccurrences(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/occurrences/`);
  }

  getHistory(filters: any, page: number = 1, size: number = 20): Observable<any> {
    let params = new HttpParams().set('page', page).set('size', size);
    Object.keys(filters).forEach(key => {
      if (filters[key]) params = params.set(key, filters[key]);
    });
    return this.http.get(`${this.baseUrl}/occurrences/historico/`, { params });
  }

  updateStatus(id: number, status: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/occurrences/${id}/status`, { status });
  }

  // --- Exportação ---
  getExportUrl(type: 'csv' | 'pdf', filters: any): string {
    let params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    return `${this.baseUrl}/occurrences/export/${type}?${params.toString()}`;
  }

  // --- Dashboard (dashboard.py) ---
  getDashboardSummary(): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard/summary`);
  }

  getOccurrenceById(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/occurrences/${id}`);
  }
}