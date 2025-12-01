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
      label: 'Clientes',
      icon: 'pi pi-users',
      routerLink: '/administration/clients',
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
}

