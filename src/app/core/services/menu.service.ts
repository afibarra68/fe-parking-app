import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject, map, catchError } from 'rxjs';
import { MenuItem } from '../models/menu-item.model';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  
  private menuItemsSubject = new BehaviorSubject<MenuItem[]>([]);
  public menuItems$ = this.menuItemsSubject.asObservable();

  private apiUrl = environment.apiAuthJwt;
  private initialized = false;

  constructor() {
    // Solo cargar en el navegador, no en SSR
    if (isPlatformBrowser(this.platformId)) {
      this.loadMenuItems();
    }
  }

  /**
   * Carga los items del menú desde el API o usa los por defecto
   */
  loadMenuItems(): void {
    // Solo cargar en el navegador
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Intentar cargar desde API
    this.getMenuItemsFromApi().subscribe({
      next: (items) => {
        const filteredItems = this.filterMenuByRoles(items);
        this.menuItemsSubject.next(filteredItems);
        this.initialized = true;
      },
      error: () => {
        // Si falla, usar items por defecto
        const defaultItems = this.getDefaultMenuItems();
        const filteredItems = this.filterMenuByRoles(defaultItems);
        this.menuItemsSubject.next(filteredItems);
        this.initialized = true;
      }
    });
  }

  /**
   * Obtiene los items del menú desde el API
   */
  private getMenuItemsFromApi(): Observable<MenuItem[]> {
    // TODO: Implementar endpoint cuando esté disponible
    // return this.http.get<MenuItem[]>(`${this.apiUrl}/menu/items`);
    
    // Por ahora retorna un observable vacío para usar defaults
    return of([]);
  }

  /**
   * Obtiene los items del menú actuales
   */
  getMenuItems(): Observable<MenuItem[]> {
    return this.menuItems$.pipe(
      map(items => this.filterMenuByRoles(items))
    );
  }

  /**
   * Obtiene los items del menú de forma síncrona (último valor)
   */
  getMenuItemsSync(): MenuItem[] {
    return this.filterMenuByRoles(this.menuItemsSubject.value);
  }

  /**
   * Filtra los items del menú según los roles del usuario
   */
  private filterMenuByRoles(items: MenuItem[]): MenuItem[] {
    // Solo filtrar por roles si estamos en el navegador
    if (!isPlatformBrowser(this.platformId)) {
      return items;
    }

    try {
      const userRoles = this.authService.getUserData()?.roles || [];
      
      return items
        .filter(item => this.isItemVisible(item, userRoles))
        .map(item => {
          if (item.children && item.children.length > 0) {
            return {
              ...item,
              children: this.filterMenuByRoles(item.children)
            };
          }
          return item;
        });
    } catch (error) {
      // Si hay error accediendo a userData, retornar items sin filtrar
      console.warn('Error filtering menu by roles:', error);
      return items;
    }
  }

  /**
   * Verifica si un item del menú debe ser visible según los roles
   */
  private isItemVisible(item: MenuItem, userRoles: string[]): boolean {
    // Si el item tiene visible: false, no mostrarlo
    if (item.visible === false) {
      return false;
    }

    // Si el item tiene roles requeridos, verificar que el usuario los tenga
    // TODO: Agregar propiedad 'requiredRoles' al MenuItem si es necesario
    // if (item.requiredRoles && item.requiredRoles.length > 0) {
    //   return item.requiredRoles.some(role => userRoles.includes(role));
    // }

    return true;
  }

  /**
   * Items del menú por defecto
   */
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

  /**
   * Actualiza los items del menú manualmente
   */
  setMenuItems(items: MenuItem[]): void {
    const filteredItems = this.filterMenuByRoles(items);
    this.menuItemsSubject.next(filteredItems);
  }

  /**
   * Agrega un item al menú
   */
  addMenuItem(item: MenuItem): void {
    const currentItems = this.menuItemsSubject.value;
    this.setMenuItems([...currentItems, item]);
  }

  /**
   * Elimina un item del menú por ID
   */
  removeMenuItem(itemId: string): void {
    const currentItems = this.menuItemsSubject.value;
    const filtered = this.removeItemRecursive(currentItems, itemId);
    this.setMenuItems(filtered);
  }

  /**
   * Elimina un item recursivamente
   */
  private removeItemRecursive(items: MenuItem[], itemId: string): MenuItem[] {
    return items
      .filter(item => item.id !== itemId)
      .map(item => {
        if (item.children && item.children.length > 0) {
          return {
            ...item,
            children: this.removeItemRecursive(item.children, itemId)
          };
        }
        return item;
      });
  }

  /**
   * Recarga los items del menú
   */
  reloadMenuItems(): void {
    this.loadMenuItems();
  }
}

