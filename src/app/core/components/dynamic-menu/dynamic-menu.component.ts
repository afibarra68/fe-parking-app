import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MenuService } from '../../services/menu.service';
import { SidebarService } from '../../services/sidebar.service';
import { AuthService } from '../../services/auth.service';
import { MenuItem } from '../../models/menu-item.model';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-dynamic-menu',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './dynamic-menu.component.html',
  styleUrls: ['./dynamic-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DynamicMenuComponent {
  private readonly menuService = inject(MenuService);
  private readonly sidebarService = inject(SidebarService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  
  // Roles permitidos para ver items restringidos (Países y Servicios de Negocio)
  private readonly RESTRICTED_ITEMS_ALLOWED_ROLES = ['SUPER_USER', 'LEVEL_10_MULTI_ROLE', 'SUPER_ADMIN'];
  
  // Rol más alto - solo para acceso a Empresas
  private readonly HIGHEST_ROLE = 'SUPER_USER';
  
  // Usar computed signal para derivar los items visibles del menú
  // Esto evita re-renderizados innecesarios y mantiene el componente estático
  // Depende del signal de roles para reactividad
  readonly menuItems = computed(() => {
    // Leer el signal de roles para hacer este computed reactivo
    // Esto fuerza que el computed se recalcule cuando los roles cambien
    const userRolesSignal = this.authService.getUserRoles();
    const userRoles = userRolesSignal(); // Leer el valor del signal
    
    const items = this.menuService.getMenuItems()();
    return items
      .filter(item => {
        // Filtrar por visible
        if (item.visible === false) {
          return false;
        }
        
        // Filtrar "Empresas" - solo rol más alto (SUPER_USER)
        if (item.label === 'Empresas') {
          return this.hasHighestRoleAccess();
        }
        
        // Filtrar "Países" y "Servicios de Negocio" basado en roles
        if (item.label === 'Países' || item.label === 'Servicios de Negocio') {
          return this.hasRestrictedAccess();
        }
        
        return true;
      })
      .map(item => {
        // Si tiene subitems, también filtrar los subitems
        if (item.items && item.items.length > 0) {
          return {
            ...item,
            items: item.items.filter(subItem => subItem.visible !== false)
          };
        }
        return item;
      });
  });
  
  /**
   * Verifica si el usuario tiene acceso a items restringidos
   * Solo usuarios con roles SUPER_USER, LEVEL_10_MULTI_ROLE o SUPER_ADMIN pueden acceder
   * Aplica a: Países, Servicios de Negocio
   */
  private hasRestrictedAccess(): boolean {
    return this.RESTRICTED_ITEMS_ALLOWED_ROLES.some(role => this.authService.hasRole(role));
  }

  /**
   * Verifica si el usuario tiene el rol más alto (SUPER_USER)
   * Solo para acceso a Empresas
   */
  private hasHighestRoleAccess(): boolean {
    return this.authService.hasRole(this.HIGHEST_ROLE);
  }
  
  // Exponer el estado colapsado del sidebar
  readonly collapsed = this.sidebarService.collapsed;
  readonly mobileMenuOpen = this.sidebarService.mobileMenuOpen;
  
  readonly isMobile = computed(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768;
  });

  constructor() {
    // Cerrar el menú móvil al navegar
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.isMobile() && this.mobileMenuOpen()) {
          this.sidebarService.closeMobileMenu();
        }
      });
  }
  
  onMenuClick(): void {
    // Cerrar el menú móvil al hacer clic en un enlace
    if (this.isMobile() && this.mobileMenuOpen()) {
      this.sidebarService.closeMobileMenu();
    }
  }

  /**
   * Maneja el click en un item padre con submenu
   * Toggle el estado expandido/colapsado
   */
  onParentClick(event: Event, item: MenuItem): void {
    if (item.items && item.items.length > 0 && item.id) {
      event.preventDefault();
      event.stopPropagation();
      this.menuService.toggleMenuItem(item.id);
    }
  }

  /**
   * Verifica si un item está expandido
   */
  isExpanded(item: MenuItem): boolean {
    return item.expanded === true;
  }

  /**
   * Verifica si un item tiene submenu
   */
  hasSubmenu(item: MenuItem): boolean {
    return item.items !== undefined && item.items.length > 0;
  }
}

