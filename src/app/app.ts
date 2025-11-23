import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './core/components/sidebar/sidebar.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('t-parking');
  
  sidebarOpen = true;
  sidebarCollapsed = false;
  sidebarClosed = false;
  
  onSidebarStateChange(state: 'open' | 'collapsed' | 'closed'): void {
    this.sidebarOpen = state === 'open';
    this.sidebarCollapsed = state === 'collapsed';
    this.sidebarClosed = state === 'closed';
  }
}
