import { Component, inject, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';

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
  
  userData: any = null;

  constructor() {
    // Cargar datos del usuario solo en el navegador
    afterNextRender(() => {
      this.loadUserData();
    });
  }

  loadUserData(): void {
    const data = this.authService.getUserData();
    this.userData = data;
  }

  logout(): void {
    this.authService.logout();
  }

  getInitials(): string {
    if (!this.userData) return 'U';
    const firstName = this.userData.firstName || '';
    const lastName = this.userData.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';
  }

  getFullName(): string {
    if (!this.userData) return 'Usuario';
    const firstName = this.userData.firstName || '';
    const lastName = this.userData.lastName || '';
    return `${firstName} ${lastName}`.trim() || 'Usuario';
  }
}

