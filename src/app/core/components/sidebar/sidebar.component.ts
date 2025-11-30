import { Component, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DynamicMenuComponent } from '../dynamic-menu/dynamic-menu.component';
import { ButtonModule } from 'primeng/button';
import { SidebarService } from '../../services/sidebar.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, DynamicMenuComponent, ButtonModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  private sidebarService = inject(SidebarService);
  
  collapsed = this.sidebarService.collapsed();

  constructor() {
    // Reaccionar a cambios en el estado del sidebar
    effect(() => {
      this.collapsed = this.sidebarService.collapsed();
    });
  }

  toggleSidebar(): void {
    this.sidebarService.toggle();
  }
}

