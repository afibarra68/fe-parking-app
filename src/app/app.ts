import { Component, signal, inject, afterNextRender, effect } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from './core/components/sidebar/sidebar.component';
import { UserControlComponent } from './core/components/user-control/user-control.component';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';
import { SidebarService } from './core/services/sidebar.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent, UserControlComponent, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('t-parking');
  private router = inject(Router);
  private authService = inject(AuthService);
  private sidebarService = inject(SidebarService);
  showSidebar = signal(false);
  sidebarCollapsed = signal(false);

  constructor() {
    // Reaccionar a cambios en el estado del sidebar
    effect(() => {
      this.sidebarCollapsed.set(this.sidebarService.collapsed());
    });

    // Usar afterNextRender para ejecutar código solo en el navegador
    afterNextRender(() => {
      // Función para verificar y actualizar el estado del sidebar
      const updateSidebarState = () => {
        const currentUrl = this.router.url;
        // Verificar si estamos en cualquier ruta de autenticación
        const isAuthPage = currentUrl.startsWith('/auth') || currentUrl === '/login';
        const isAuthenticated = this.authService.isAuthenticated();
        // Solo mostrar sidebar si está autenticado Y no está en página de auth
        this.showSidebar.set(isAuthenticated && !isAuthPage);
      };

      // Verificar estado inicial
      updateSidebarState();

      // Mostrar sidebar solo si el usuario está autenticado y no está en login
      this.router.events
        .pipe(filter(event => event instanceof NavigationEnd))
        .subscribe(() => {
          // Usar requestAnimationFrame para asegurar que la navegación esté completa
          requestAnimationFrame(() => {
            updateSidebarState();
          });
        });
    });
  }
}
