import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-6 right-6 z-[10000] flex flex-col gap-3 pointer-events-none">
      <div *ngFor="let toast of toastService.toasts()" 
           class="pointer-events-auto min-w-[300px] bg-[#1E1E1E] border-l-4 text-white px-4 py-3 rounded shadow-2xl animate-slide-in flex items-center gap-3 backdrop-blur-md bg-opacity-95 border border-white/10"
           [ngClass]="{
             'border-l-green-500': toast.type === 'success',
             'border-l-red-500': toast.type === 'error',
             'border-l-blue-500': toast.type === 'info'
           }">
        
        <div [ngSwitch]="toast.type">
          <i *ngSwitchCase="'success'" class="fas fa-check-circle text-green-500 text-lg"></i>
          <i *ngSwitchCase="'error'" class="fas fa-exclamation-circle text-red-500 text-lg"></i>
          <i *ngSwitchCase="'info'" class="fas fa-info-circle text-blue-500 text-lg"></i>
        </div>
        
        <div class="flex-1">
          <h4 class="font-bold text-[10px] uppercase tracking-wider text-gray-400">{{ toast.type }}</h4>
          <p class="text-sm font-medium">{{ toast.message }}</p>
        </div>

        <button (click)="toastService.remove(toast.id)" class="text-gray-500 hover:text-white transition-colors">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .animate-slide-in { animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
  `]
})
export class ToastComponent {
  constructor(public toastService: ToastService) {}
}