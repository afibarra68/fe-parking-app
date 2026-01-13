import { Injectable, signal } from '@angular/core';
import { MenuItem } from '../models/menu-item.model';

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private menuItems = signal<MenuItem[]>([
    {
      label: 'Países',
      icon: 'pi pi-globe',
      routerLink: '/administration/countries',
      visible: true
    },
    {
      label: 'Empresas',
      icon: 'pi pi-building',
      routerLink: '/administration/companies',
      visible: true
    },
    {
      label: 'Información de la Empresa',
      icon: 'pi pi-info-circle',
      routerLink: '/administration/about',
      visible: true
    },
    {
      label: 'Clientes',
      icon: 'pi pi-users',
      routerLink: '/administration/clients',
      visible: true
    },
    {
      label: 'Historial de Suscripciones',
      icon: 'pi pi-history',
      routerLink: '/administration/subscription-history-status',
      visible: true
    },
    {
      label: 'Servicios de Negocio',
      icon: 'pi pi-briefcase',
      routerLink: '/administration/business-service',
      visible: true
    },
    {
      label: 'Empresa - Servicios',
      icon: 'pi pi-link',
      routerLink: '/administration/company-business-service',
      visible: true
    },
    {
      label: 'Vehículos Parqueados',
      icon: 'pi pi-car',
      routerLink: '/administration/vehiculos-parqueados',
      visible: true
    },
    {
      label: 'Transacciones Cerradas',
      icon: 'pi pi-check-circle',
      routerLink: '/administration/closed-transactions',
      visible: true
    },
    {
      label: 'Configuración',
      icon: 'pi pi-cog',
      visible: true,
      id: 'configuracion-menu',
      expanded: false,
      items: [
        {
          label: 'Administración Tarifas',
          icon: 'pi pi-dollar',
          routerLink: '/configuration/billing-prices',
          visible: true
        },
        {
          label: 'Impresoras',
          icon: 'pi pi-print',
          routerLink: '/configuration/printers',
          visible: true
        },
        {
          label: 'Plantillas de Tirilla',
          icon: 'pi pi-file-edit',
          routerLink: '/configuration/ticket-templates',
          visible: true
        },
        {
          label: 'Usuario - Impresora',
          icon: 'pi pi-link',
          routerLink: '/configuration/user-printers',
          visible: true
        },
        {
          label: 'Tipos de Impresora por Usuario',
          icon: 'pi pi-shield',
          routerLink: '/configuration/user-printer-types',
          visible: true
        }
      ]
    },
    {
      label: 'Usuarios',
      icon: 'pi pi-user',
      visible: true,
      id: 'usuarios-menu',
      expanded: false, // Por defecto colapsado
      items: [
        {
          label: 'Gestión de Usuarios',
          icon: 'pi pi-users',
          routerLink: '/administration/users',
          visible: true
        },
        {
          label: 'Relaciones Usuario-Rol',
          icon: 'pi pi-link',
          routerLink: '/administration/user-roles',
          visible: true
        },
        {
          label: 'About Roles',
          icon: 'pi pi-info-circle',
          routerLink: '/administration/about-roles',
          visible: true
        }
      ]
    }
    // Aquí se pueden agregar más items del menú dinámicamente
  ]);

  getMenuItems() {
    return this.menuItems.asReadonly();
  }

  addMenuItem(item: MenuItem) {
    this.menuItems.update(items => [...items, item]);
  }

  removeMenuItem(label: string) {
    this.menuItems.update(items => items.filter(item => item.label !== label));
  }

  clearMenu() {
    this.menuItems.set([]);
  }

  /**
   * Agrega un sub-item a un item del menú existente
   * @param parentId ID del item padre
   * @param subItem Nuevo sub-item a agregar
   */
  addSubItem(parentId: string, subItem: MenuItem): void {
    this.menuItems.update(items => {
      return items.map(item => {
        if (item.id === parentId) {
          const updatedItems = item.items ? [...item.items, subItem] : [subItem];
          return { ...item, items: updatedItems };
        }
        return item;
      });
    });
  }

  /**
   * Remueve un sub-item de un item del menú
   * @param parentId ID del item padre
   * @param subItemLabel Label del sub-item a remover
   */
  removeSubItem(parentId: string, subItemLabel: string): void {
    this.menuItems.update(items => {
      return items.map(item => {
        if (item.id === parentId && item.items) {
          const updatedItems = item.items.filter(subItem => subItem.label !== subItemLabel);
          return { ...item, items: updatedItems };
        }
        return item;
      });
    });
  }

  /**
   * Toggle el estado expandido/colapsado de un item del menú
   * @param itemId ID del item
   */
  toggleMenuItem(itemId: string): void {
    this.menuItems.update(items => {
      return items.map(item => {
        if (item.id === itemId) {
          return { ...item, expanded: !item.expanded };
        }
        return item;
      });
    });
  }

  /**
   * Expande un item del menú
   * @param itemId ID del item
   */
  expandMenuItem(itemId: string): void {
    this.menuItems.update(items => {
      return items.map(item => {
        if (item.id === itemId) {
          return { ...item, expanded: true };
        }
        return item;
      });
    });
  }

  /**
   * Colapsa un item del menú
   * @param itemId ID del item
   */
  collapseMenuItem(itemId: string): void {
    this.menuItems.update(items => {
      return items.map(item => {
        if (item.id === itemId) {
          return { ...item, expanded: false };
        }
        return item;
      });
    });
  }
}

