import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { MenuService } from '../../services/menu.service';
import { DynamicMenuComponent } from '../dynamic-menu/dynamic-menu.component';
import { MenuLoaderComponent } from '../menu-loader/menu-loader.component';
import { MenuItem } from '../../models/menu-item.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, DynamicMenuComponent, MenuLoaderComponent],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() menuItems: MenuItem[] = [];
  @Input() useMenuService: boolean = true; // Si true, carga desde MenuService, si false usa @Input menuItems
  @Output() sidebarStateChange = new EventEmitter<'open' | 'collapsed' | 'closed'>();
  
  isAuthenticated: boolean = false;
  loading: boolean = false;
  displayMenuItems: MenuItem[] = [];
  
  // Estado del sidebar: 'open' | 'collapsed' | 'closed'
  sidebarState = signal<'open' | 'collapsed' | 'closed'>('open');

  private destroy$ = new Subject<void>();
  private authService = inject(AuthService);
  private menuService = inject(MenuService);

  constructor() {}

  ngOnInit(): void {
    this.isAuthenticated = this.authService.isAuthenticated();
    
    if (this.useMenuService && this.isAuthenticated) {
      // Cargar desde MenuService
      this.loadMenuFromService();
    } else if (this.menuItems.length > 0) {
      // Usar items pasados como @Input
      this.displayMenuItems = this.menuItems;
    } else {
      // Usar items por defecto
      this.displayMenuItems = this.getDefaultMenuItems();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadMenuFromService(): void {
    this.loading = true;
    
    // Verificar si el servicio ya tiene items cargados
    const currentItems = this.menuService.getMenuItemsSync();
    if (currentItems.length > 0) {
      this.displayMenuItems = currentItems;
      this.loading = false;
    } else {
      // Si no hay items, usar los por defecto mientras se cargan
      this.displayMenuItems = this.getDefaultMenuItems();
    }

    // Suscribirse a cambios futuros
    this.menuService.getMenuItems()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          // Solo actualizar si hay items, sino mantener los por defecto
          if (items && items.length > 0) {
            this.displayMenuItems = items;
          } else {
            this.displayMenuItems = this.getDefaultMenuItems();
          }
          this.loading = false;
        },
        error: () => {
          // Si falla, usar items por defecto
          this.displayMenuItems = this.getDefaultMenuItems();
          this.loading = false;
        }
      });
  }

  private getDefaultMenuItems(): MenuItem[] {
    return [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'pi pi-home',
        routerLink: '/dashboard',
        visible: true
      },
      {
        id: 'administration',
        label: 'Administración',
        icon: 'pi pi-cog',
        visible: true,
        children: [
          {
            id: 'countries',
            label: 'Países',
            icon: 'pi pi-globe',
            routerLink: '/administration/countries',
            visible: true
          },
          {
            id: 'users',
            label: 'Usuarios',
            icon: 'pi pi-users',
            routerLink: '/auth/users',
            visible: true
          },
          {
            id: 'settings',
            label: 'Configuración',
            icon: 'pi pi-sliders-h',
            routerLink: '/dashboard/settings',
            visible: true
          }
        ]
      }
    ];
  }

  toggleSidebar(): void {
    const currentState = this.sidebarState();
    if (currentState === 'open') {
      this.sidebarState.set('closed');
    } else if (currentState === 'closed') {
      this.sidebarState.set('open');
    } else {
      // Si está colapsado, cerrarlo completamente
      this.sidebarState.set('closed');
    }
    this.sidebarStateChange.emit(this.sidebarState());
  }

  toggleCollapse(): void {
    const currentState = this.sidebarState();
    if (currentState === 'open') {
      this.sidebarState.set('collapsed');
    } else if (currentState === 'collapsed') {
      this.sidebarState.set('open');
    } else {
      // Si está cerrado, abrirlo colapsado
      this.sidebarState.set('collapsed');
    }
    this.sidebarStateChange.emit(this.sidebarState());
  }

  get isCollapsed(): boolean {
    return this.sidebarState() === 'collapsed';
  }

  get isClosed(): boolean {
    return this.sidebarState() === 'closed';
  }

  get isOpen(): boolean {
    return this.sidebarState() === 'open';
  }

  reloadMenu(): void {
    if (this.useMenuService) {
      this.menuService.reloadMenuItems();
      this.loadMenuFromService();
    }
  }
}

