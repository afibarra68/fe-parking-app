# Componentes Core - Sidebar y Menú Dinámico

## Descripción

Este módulo contiene componentes reutilizables para crear un menú lateral dinámico que se muestra después del login.

## Componentes

### SidebarComponent

Componente principal del sidebar que se muestra cuando el usuario está autenticado.

**Ubicación**: `core/components/sidebar/sidebar.component.ts`

**Características**:
- Se muestra automáticamente cuando el usuario está autenticado
- Soporta colapsar/expandir
- Acepta items de menú personalizados
- Integrado con `AuthService` para verificar autenticación

### DynamicMenuComponent

Componente que renderiza el menú de forma recursiva con soporte para submenús.

**Ubicación**: `core/components/dynamic-menu/dynamic-menu.component.ts`

**Características**:
- Renderizado recursivo de menús y submenús
- Soporte para iconos (PrimeIcons)
- Soporte para badges
- Estados expandido/colapsado
- Visibilidad condicional de items

## Modelo de Datos

### MenuItem

```typescript
interface MenuItem {
  id: string;                    // Identificador único
  label: string;                  // Texto a mostrar
  icon?: string;                  // Clase de icono (ej: 'pi pi-home')
  routerLink?: string;            // Ruta de Angular Router
  children?: MenuItem[];          // Submenús (opcional)
  visible?: boolean;              // Visibilidad del item (default: true)
  badge?: string;                 // Texto del badge
  badgeClass?: string;            // Clase CSS del badge
}
```

## Uso

### Importar desde CoreModule

```typescript
import { CoreModule } from './core/core-module';
import { SidebarComponent, MenuItem } from './core/components';

@NgModule({
  imports: [
    CoreModule,  // Importa y exporta SidebarComponent y DynamicMenuComponent
    // ... otros módulos
  ]
})
export class YourModule { }
```

### Usar en un Componente Standalone

```typescript
import { Component } from '@angular/core';
import { SidebarComponent } from './core/components/sidebar/sidebar.component';
import { MenuItem } from './core/models/menu-item.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [SidebarComponent],
  template: `
    <app-sidebar [menuItems]="menuItems"></app-sidebar>
    <div class="content">
      <!-- Tu contenido aquí -->
    </div>
  `
})
export class DashboardComponent {
  menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'pi pi-home',
      routerLink: '/dashboard',
      visible: true
    },
    {
      id: 'users',
      label: 'Usuarios',
      icon: 'pi pi-users',
      routerLink: '/dashboard/users',
      visible: true
    }
  ];
}
```

### Ejemplo con Submenús

```typescript
menuItems: MenuItem[] = [
  {
    id: 'administration',
    label: 'Administración',
    icon: 'pi pi-cog',
    visible: true,
    children: [
      {
        id: 'users',
        label: 'Usuarios',
        icon: 'pi pi-users',
        routerLink: '/dashboard/users',
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
```

## Estilos

Los componentes incluyen estilos SCSS que pueden ser personalizados:

- `sidebar.component.scss`: Estilos del contenedor del sidebar
- `dynamic-menu.component.scss`: Estilos del menú y sus items

## Notas

- El sidebar solo se muestra cuando `AuthService.isAuthenticated()` retorna `true`
- Los items con `visible: false` no se renderizan
- Los iconos usan PrimeIcons (clases `pi pi-*`)
- El sidebar es fijo y requiere ajustar el margen del contenido principal

