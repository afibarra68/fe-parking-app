import { Component, inject, signal, ChangeDetectorRef, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-user-control',
  standalone: true,
  imports: [CommonModule, ButtonModule, AvatarModule],
  templateUrl: './user-control.component.html',
  styleUrls: ['./user-control.component.scss']
})
export class UserControlComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  
  userData = signal<any>(null);

  constructor() {
    // Cargar datos del usuario inicialmente
    afterNextRender(() => {
      this.loadUserData();
      
      // Suscribirse a cambios de ruta para recargar datos si es necesario
      this.router.events
        .pipe(filter(event => event instanceof NavigationEnd))
        .subscribe(() => {
          this.loadUserData();
        });
      
      // Verificar autenticación periódicamente (cada vez que se navega)
      // También podemos usar un intervalo si es necesario
      setInterval(() => {
        if (this.authService.isAuthenticated()) {
          const currentData = this.userData();
          const newData = this.authService.getUserData();
          // Solo actualizar si los datos han cambiado
          if (JSON.stringify(currentData) !== JSON.stringify(newData)) {
            this.loadUserData();
          }
        } else {
          this.userData.set(null);
        }
      }, 1000); // Verificar cada segundo
    });
  }

  loadUserData(): void {
    if (this.authService.isAuthenticated()) {
      const data = this.authService.getUserData();
      this.userData.set(data);
      this.cdr.detectChanges();
    } else {
      this.userData.set(null);
    }
  }

  logout(): void {
    this.authService.logout();
    this.userData.set(null);
  }

  getInitials(): string {
    const data = this.userData();
    if (!data) return 'U';
    const firstName = data.firstName || '';
    const lastName = data.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';
  }

  getFullName(): string {
    const data = this.userData();
    if (!data) return 'Usuario';
    const firstName = data.firstName || '';
    const lastName = data.lastName || '';
    return `${firstName} ${lastName}`.trim() || 'Usuario';
  }
}

