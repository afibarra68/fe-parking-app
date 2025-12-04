import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';

interface Role {
  name: string;
  description: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-about-roles',
  standalone: true,
  imports: [
    CommonModule,
    CardModule
  ],
  templateUrl: './about-roles.component.html',
  styleUrls: ['./about-roles.component.scss']
})
export class AboutRolesComponent implements OnInit {
  roles: Role[] = [
    {
      name: 'SUPER_USER',
      description: 'Usuario con acceso completo al sistema. Puede realizar todas las operaciones sin restricciones.',
      icon: 'pi pi-star',
      color: '#FFD700'
    },
    {
      name: 'SUPER_ADMIN',
      description: 'Administrador principal del sistema. Gestiona configuraciones globales y tiene acceso a todas las funcionalidades administrativas.',
      icon: 'pi pi-shield',
      color: '#FF6B6B'
    },
    {
      name: 'ADMINISTRATOR_PRINCIPAL',
      description: 'Administrador principal de la empresa. Gestiona usuarios, configuraciones y operaciones de la organización.',
      icon: 'pi pi-user-edit',
      color: '#4ECDC4'
    },
    {
      name: 'ADMIN_APP',
      description: 'Administrador de la aplicación. Puede gestionar configuraciones, usuarios y operaciones dentro de su ámbito.',
      icon: 'pi pi-cog',
      color: '#45B7D1'
    },
    {
      name: 'USER_APP',
      description: 'Usuario estándar de la aplicación. Acceso a funcionalidades básicas según permisos asignados.',
      icon: 'pi pi-user',
      color: '#96CEB4'
    },
    {
      name: 'AUDIT_SELLER',
      description: 'Auditor y vendedor. Puede revisar transacciones, generar reportes y realizar operaciones de venta.',
      icon: 'pi pi-chart-bar',
      color: '#FFEAA7'
    },
    {
      name: 'PARKING_ATTENDANT',
      description: 'Atendente de parqueadero. Gestiona el ingreso y salida de vehículos, y procesa transacciones de estacionamiento.',
      icon: 'pi pi-car',
      color: '#DDA15E'
    }
  ];

  ngOnInit(): void {
    // Los roles ya están definidos estáticamente
  }
}

