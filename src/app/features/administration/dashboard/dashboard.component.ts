import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MenuService } from '../../../core/services/menu.service';
import { MenuItem } from '../../../core/models/menu-item.model';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

interface ModuleCard {
  label: string;
  icon: string;
  routerLink: string;
  description?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  modules: ModuleCard[] = [];

  constructor(
    private menuService: MenuService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadModules();
  }

  private loadModules(): void {
    const menuItems = this.menuService.getMenuItems();
    const flatModules: ModuleCard[] = [];
    
    // Módulos que no deben aparecer en el dashboard
    const excludedModules = [
      '/administration/users',
      '/administration/user-roles',
      '/administration/about-roles',
      '/administration/countries',
      '/administration/companies',
      'Gestión de Usuarios',
      'Relaciones Usuario-Rol',
      'About Roles',
      'Países',
      'Empresas'
    ];

    menuItems().forEach(item => {
      if (item.routerLink && item.visible) {
        // Módulo principal con ruta directa - excluir si está en la lista
        if (!excludedModules.some(excluded => 
          item.routerLink?.includes(excluded) || item.label === excluded
        )) {
          flatModules.push({
            label: item.label,
            icon: item.icon || 'pi pi-circle',
            routerLink: item.routerLink,
            description: this.getDescription(item.label)
          });
        }
      } else if (item.items && item.visible) {
        // Módulo con subitems - agregar cada subitem, excluyendo los de usuarios
        item.items.forEach(subItem => {
          if (subItem.routerLink && subItem.visible) {
            // Excluir módulos de usuarios y roles
            if (!excludedModules.some(excluded => 
              subItem.routerLink?.includes(excluded) || subItem.label === excluded
            )) {
              flatModules.push({
                label: subItem.label,
                icon: subItem.icon || item.icon || 'pi pi-circle',
                routerLink: subItem.routerLink,
                description: this.getDescription(subItem.label)
              });
            }
          }
        });
      }
    });

    this.modules = flatModules;
  }

  private getDescription(label: string): string {
    const descriptions: { [key: string]: string } = {
      'Países': 'Gestiona los países disponibles en el sistema',
      'Empresas': 'Administra las empresas registradas',
      'Clientes': 'Gestiona la información de los clientes',
      'Servicios de Negocio': 'Administra los servicios de negocio disponibles',
      'Empresa - Servicios': 'Gestiona la relación entre empresas y servicios',
      'Vehículos Parqueados': 'Consulta los vehículos actualmente en el estacionamiento',
      'Transacciones Cerradas': 'Visualiza las transacciones completadas',
      'Tarifas': 'Configura las tarifas por rangos de horas',
      'Gestión de Usuarios': 'Administra los usuarios del sistema',
      'Relaciones Usuario-Rol': 'Gestiona los roles asignados a los usuarios'
    };

    return descriptions[label] || `Accede al módulo de ${label}`;
  }

  navigateToModule(routerLink: string): void {
    if (routerLink) {
      this.router.navigate([routerLink]);
    }
  }
}

