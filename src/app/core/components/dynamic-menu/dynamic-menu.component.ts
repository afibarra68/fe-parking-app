import { Component, OnInit, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuService } from '../../services/menu.service';
import { MenuItem } from '../../models/menu-item.model';

@Component({
  selector: 'app-dynamic-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dynamic-menu.component.html',
  styleUrls: ['./dynamic-menu.component.scss']
})
export class DynamicMenuComponent implements OnInit {
  private menuService = inject(MenuService);
  menuItems: MenuItem[] = [];

  constructor() {
    // Reaccionar a cambios en el menú
    effect(() => {
      const items = this.menuService.getMenuItems()();
      this.menuItems = items.filter(item => item.visible !== false);
    });
  }

  ngOnInit(): void {
    const items = this.menuService.getMenuItems()();
    this.menuItems = items.filter(item => item.visible !== false);
  }
}

