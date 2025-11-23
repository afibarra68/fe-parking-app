import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { MenuService } from '../../services/menu.service';
import { MenuItem } from '../../models/menu-item.model';

@Component({
  selector: 'app-menu-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (loading) {
      <div class="menu-loader">
        <i class="pi pi-spin pi-spinner"></i>
        <span>Cargando menú...</span>
      </div>
    }
    @if (error) {
      <div class="menu-error">
        <i class="pi pi-exclamation-triangle"></i>
        <span>{{ error }}</span>
      </div>
    }
  `,
  styles: [`
    .menu-loader,
    .menu-error {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      color: #666;
      font-size: 0.9rem;
    }

    .menu-loader {
      i {
        animation: spin 1s linear infinite;
      }
    }

    .menu-error {
      color: #d32f2f;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class MenuLoaderComponent implements OnInit, OnDestroy {
  @Input() showLoader: boolean = true;
  @Output() menuItemsLoaded = new EventEmitter<MenuItem[]>();
  
  loading: boolean = false;
  error: string | null = null;
  menuItems: MenuItem[] = [];

  private destroy$ = new Subject<void>();

  constructor(private menuService: MenuService) {}

  ngOnInit(): void {
    this.loadMenuItems();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMenuItems(): void {
    this.loading = true;
    this.error = null;

    this.menuService.getMenuItems()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          this.menuItems = items;
          this.loading = false;
          this.menuItemsLoaded.emit(items);
        },
        error: (err) => {
          this.error = 'Error al cargar el menú';
          this.loading = false;
          console.error('Error loading menu:', err);
        }
      });
  }

  reload(): void {
    this.menuService.reloadMenuItems();
    this.loadMenuItems();
  }
}

