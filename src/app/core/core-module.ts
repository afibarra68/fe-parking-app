import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Importar componentes standalone
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { DynamicMenuComponent } from './components/dynamic-menu/dynamic-menu.component';
import { MenuLoaderComponent } from './components/menu-loader/menu-loader.component';

// Importar servicios
import { MenuService } from './services/menu.service';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule,
    // Importar componentes standalone
    SidebarComponent,
    DynamicMenuComponent,
    MenuLoaderComponent
  ],
  exports: [
    // Exportar componentes para que otros módulos puedan usarlos
    SidebarComponent,
    DynamicMenuComponent,
    MenuLoaderComponent
  ],
  providers: [
    // Los servicios con providedIn: 'root' no necesitan estar aquí,
    // pero se pueden agregar si se necesita una instancia específica del módulo
    MenuService
  ]
})
export class CoreModule { }
