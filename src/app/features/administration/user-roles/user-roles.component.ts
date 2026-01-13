import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UserRoleService, UserRole, UserRolePageResponse, DUserRole, DUser } from '../../../core/services/user-role.service';
import { EnumService, EnumResource } from '../../../core/services/enum.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SharedModule } from '../../../shared/shared-module';
import { TableColumn } from '../../../shared/components/table/table.component';
import { environment } from '../../../../environments/environment';
import { BehaviorSubject, Observable, Subscription, of } from 'rxjs';
import { SelectItem } from 'primeng/api';
import { filter, switchMap, catchError } from 'rxjs/operators';

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
export class UserRolesComponent implements OnInit, OnDestroy {
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
    { field: 'appUserId', header: 'ID Usuario', width: '120px' },
    { field: 'numberIdentity', header: 'Número Identidad', width: '150px' },
    { field: 'roleDisplay', header: 'Rol', width: '250px' }
  ];

  form: FormGroup;
  searchForm: FormGroup;

  constructor(
    private userRoleService: UserRoleService,
    private enumService: EnumService,
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
  }

  ngOnInit(): void {
    // Cargar roles desde el servicio genérico de enumeradores
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
    this.rolesSubscription = this.enumService.getEnumByName('ERole')
      .pipe(
        catchError(() => of([] as EnumResource[]))
      )
      .subscribe({
        next: (rolesList: EnumResource[]) => {
          this.roles = rolesList.map(role => ({
            label: role.description,
            value: role.id
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
          // Formatear role para mostrar en la tabla
          const formattedData = (data.content || []).map(userRole => ({
            ...userRole,
            roleDisplay: this.getRoleDescription(userRole.role)
          }));
          
          this.tableDataSubject.next({
            data: formattedData,
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

  /**
   * Obtiene la descripción del rol para mostrar en la tabla
   * @param role Rol que puede ser EnumResource o string
   * @returns Descripción del rol o '-' si no hay rol
   */
  getRoleDescription(role: EnumResource | string | null | undefined): string {
    if (!role) {
      return '-';
    }
    
    if (typeof role === 'object' && 'description' in role) {
      return role.description || role.id || '-';
    }
    
    return role || '-';
  }

  onTableDelete(selected: any): void {
    if (selected && selected.userRoleId) {
      const itemName = selected.numberIdentity 
        ? `la relación de rol para el usuario con identidad "${selected.numberIdentity}"`
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
    
    // Extraer el ID del role si es un objeto EnumResource
    let roleValue: string = '';
    if (userRole.role) {
      if (typeof userRole.role === 'object' && 'id' in userRole.role) {
        roleValue = (userRole.role as EnumResource).id;
      } else {
        roleValue = userRole.role as string;
      }
    }
    
    this.form.patchValue({
      numberIdentity: userRole.numberIdentity || '',
      role: roleValue
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

    // Construir el objeto DUser con numberIdentity
    const user: DUser = {
      numberIdentity: this.form.value.numberIdentity
    };

    // Si estamos editando y tenemos appUserId, incluirlo
    if (this.editingUserRole && this.editingUserRole.appUserId) {
      user.appUserId = this.editingUserRole.appUserId;
    }

    // Obtener el EnumResource del rol seleccionado
    const selectedRoleId = this.form.value.role;
    const selectedRole = this.roles.find(r => r.value === selectedRoleId);
    
    // Construir EnumResource para el rol
    const roleEnumResource: EnumResource = selectedRole 
      ? { id: selectedRole.value as string, description: selectedRole.label || selectedRole.value as string }
      : { id: selectedRoleId, description: selectedRoleId };

    // Construir el objeto DUserRole según el contexto del controller
    const userRoleData: DUserRole = {
      user: user, // @NotNull
      role: roleEnumResource // @NotNull
    };

    // Si estamos editando, incluir el userRoleId
    if (this.editingUserRole && this.editingUserRole.userRoleId) {
      userRoleData.userRoleId = this.editingUserRole.userRoleId;
    }

    if (this.editingUserRole && this.editingUserRole.userRoleId) {
      // Actualizar relación existente
      this.userRoleService.update(userRoleData).subscribe({
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

