/**
 * EJEMPLO DE USO DEL MENÚ DINÁMICO
 * 
 * Este archivo muestra cómo usar los métodos del MenuService
 * para agregar/remover sub-items dinámicamente al menú de Usuarios
 */

import { MenuService } from './menu.service';
import { MenuItem } from '../models/menu-item.model';

// Ejemplo de cómo inyectar y usar el servicio
export class ExampleMenuUsage {
  constructor(private menuService: MenuService) {}

  // Ejemplo 1: Agregar un nuevo sub-item al menú de Usuarios
  addNewUserSubItem() {
    const newSubItem: MenuItem = {
      label: 'Permisos de Usuario',
      icon: 'pi pi-shield',
      routerLink: '/administration/user-permissions',
      visible: true
    };

    // Agregar el sub-item al menú de Usuarios (id: 'usuarios-menu')
    this.menuService.addSubItem('usuarios-menu', newSubItem);
  }

  // Ejemplo 2: Remover un sub-item del menú de Usuarios
  removeUserSubItem() {
    // Remover el sub-item "About Roles"
    this.menuService.removeSubItem('usuarios-menu', 'About Roles');
  }

  // Ejemplo 3: Expandir el menú de Usuarios
  expandUsersMenu() {
    this.menuService.expandMenuItem('usuarios-menu');
  }

  // Ejemplo 4: Colapsar el menú de Usuarios
  collapseUsersMenu() {
    this.menuService.collapseMenuItem('usuarios-menu');
  }

  // Ejemplo 5: Toggle (abrir/cerrar) el menú de Usuarios
  toggleUsersMenu() {
    this.menuService.toggleMenuItem('usuarios-menu');
  }

  // Ejemplo 6: Agregar múltiples sub-items
  addMultipleSubItems() {
    const subItems: MenuItem[] = [
      {
        label: 'Configuración de Usuarios',
        icon: 'pi pi-cog',
        routerLink: '/administration/user-settings',
        visible: true
      },
      {
        label: 'Historial de Usuarios',
        icon: 'pi pi-history',
        routerLink: '/administration/user-history',
        visible: true
      }
    ];

    subItems.forEach(item => {
      this.menuService.addSubItem('usuarios-menu', item);
    });
  }
}

/**
 * USO EN UN COMPONENTE:
 * 
 * import { Component, inject } from '@angular/core';
 * import { MenuService } from '../../../core/services/menu.service';
 * 
 * @Component({...})
 * export class MyComponent {
 *   private menuService = inject(MenuService);
 * 
 *   ngOnInit() {
 *     // Agregar un nuevo sub-item cuando el componente se carga
 *     this.menuService.addSubItem('usuarios-menu', {
 *       label: 'Nuevo Sub-item',
 *       icon: 'pi pi-star',
 *       routerLink: '/administration/new-route',
 *       visible: true
 *     });
 *   }
 * }
 */

