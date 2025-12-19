import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UserRoleService, UserRole, UserRolePageResponse, CreateUserRole } from '../../../core/services/user-role.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SharedModule } from '../../../shared/shared-module';
import { TableColumn } from '../../../shared/components/table/table.component';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { SelectItem } from 'primeng/api';
import { filter, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-user-roles',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    MessageModule,
    SharedModule
  ],
  templateUrl: './user-roles.component.html',
  styleUrls: ['./user-roles.component.scss']
})
export class UserRolesComponent implements OnDestroy {
  loading = false;
  showForm = false;
  editingUserRole: UserRole | null = null;
  error: string | null = null;
  roles: SelectItem[] = [];
  
  // Paginación
  page: number = 0;
  size: number = environment.rowsPerPage || 10;
  first = 0;
  
  private subscription?: Subscription;
  private rolesSubscription?: Subscription;
  
  private tableDataSubject = new BehaviorSubject<any>({
    data: [],
    totalRecords: 0,
    isFirst: true
  });
  tableData$: Observable<any> = this.tableDataSubject.asObservable();

  // Configuración de columnas para la tabla
  cols: TableColumn[] = [
    { field: 'userRoleId', header: 'ID', width: '80px' },
    { field: 'numberIdentity', header: 'Número Identidad', width: '150px' },
    { field: 'firstName', header: 'Nombre', width: '120px' },
    { field: 'lastName', header: 'Apellido', width: '120px' },
    { field: 'role', header: 'Rol', width: '150px' },
    { field: 'companyName', header: 'Empresa', width: '200px' }
  ];

  form: FormGroup;
  searchForm: FormGroup;

  constructor(
    private userRoleService: UserRoleService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      numberIdentity: ['', [Validators.required]],
      role: ['', [Validators.required]]
    });

    this.searchForm = this.fb.group({
      userRoleId: [null],
      numberIdentity: [''],
      role: ['']
    });
    // Cargar roles inicialmente (las relaciones se cargarán cuando la tabla dispare onTablePagination)
    this.loadRoles();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.rolesSubscription) {
      this.rolesSubscription.unsubscribe();
    }
    this.tableDataSubject.complete();
  }

  loadRoles(): void {
    this.rolesSubscription = this.userRoleService.getRoles().subscribe({
      next: (rolesList) => {
        this.roles = rolesList.map(role => ({
          label: role,
          value: role
        }));
      },
      error: (err) => {
        console.error('Error al cargar roles:', err);
        this.roles = [];
      }
    });
  }

  loadUserRoles(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    this.loading = true;
    this.error = null;
    
    const filters: any = {};
    if (this.searchForm.value.userRoleId) {
      filters.userRoleId = this.searchForm.value.userRoleId;
    }
    if (this.searchForm.value.numberIdentity?.trim()) {
      filters.numberIdentity = this.searchForm.value.numberIdentity.trim();
    }
    if (this.searchForm.value.role?.trim()) {
      filters.role = this.searchForm.value.role.trim();
    }
    
    this.subscription = this.userRoleService.getPageable(this.page, this.size, filters)
      .subscribe({
        next: (data: UserRolePageResponse) => {
          this.tableDataSubject.next({
            data: data.content || [],
            totalRecords: data.totalElements || 0,
            isFirst: this.page === 0
          });
          this.loading = false;
        },
        error: (err: any) => {
          this.error = err?.error?.message || err?.message || 'Error al cargar las relaciones usuario-rol';
          this.tableDataSubject.next({
            data: [],
            totalRecords: 0,
            isFirst: true
          });
          this.loading = false;
        }
      });
  }

  search(): void {
    this.page = 0;
    this.first = 0;
    this.onTablePagination({ page: 0, first: 0, rows: this.size, pageCount: 0 });
  }

  clearSearch(): void {
    this.searchForm.reset();
    this.search();
  }

  onTablePagination(event: any): void {
    this.page = event.page || 0;
    this.size = event.rows || environment.rowsPerPage || 10;
    this.first = event.first || 0;
    this.loadUserRoles();
  }

  onTableEdit(selected: any): void {
    if (selected) {
      this.openEditForm(selected);
    }
  }

  onTableDelete(selected: any): void {
    if (selected && selected.userRoleId) {
      const itemName = selected.firstName && selected.lastName 
        ? `la relación de rol para el usuario "${selected.firstName} ${selected.lastName}"`
        : 'esta relación';
      
      this.confirmationService.confirmDelete(itemName)
        .pipe(
          filter((confirmed: boolean) => confirmed),
          switchMap(() => {
            this.loading = true;
            return this.userRoleService.delete(selected.userRoleId);
          })
        )
        .subscribe({
          next: () => {
            this.loading = false;
            this.loadUserRoles();
          },
          error: (err: any) => {
            this.error = err?.error?.message || 'Error al eliminar la relación usuario-rol';
            this.loading = false;
          }
        });
    }
  }

  openCreateForm(): void {
    this.editingUserRole = null;
    this.form.reset();
    this.showForm = true;
  }

  openEditForm(userRole: UserRole): void {
    this.editingUserRole = userRole;
    this.form.patchValue({
      numberIdentity: userRole.numberIdentity || '',
      role: userRole.role || ''
    });
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingUserRole = null;
    this.form.reset();
  }

  submitForm(): void {
    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    const userRoleData: CreateUserRole = {
      numberIdentity: this.form.value.numberIdentity,
      role: this.form.value.role
    };

    if (this.editingUserRole && this.editingUserRole.userRoleId) {
      // Actualizar relación existente
      this.userRoleService.update(this.editingUserRole.userRoleId, userRoleData).subscribe({
        next: () => {
          this.loading = false;
          this.showForm = false;
          this.editingUserRole = null;
          this.form.reset();
          this.loadUserRoles();
        },
        error: (err) => {
          this.error = err?.error?.message || 'Error al actualizar la relación usuario-rol';
          this.loading = false;
          console.error('Error:', err);
        }
      });
    } else {
      // Crear nueva relación
      this.userRoleService.create(userRoleData).subscribe({
        next: () => {
          this.loading = false;
          this.showForm = false;
          this.editingUserRole = null;
          this.form.reset();
          this.loadUserRoles();
        },
        error: (err) => {
          this.error = err?.error?.message || 'Error al guardar la relación usuario-rol';
          this.loading = false;
          console.error('Error:', err);
        }
      });
    }
  }
}

