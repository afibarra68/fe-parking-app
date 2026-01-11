import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UserService, User, UserPageResponse } from '../../../core/services/user.service';
import { EnumService, EnumResource } from '../../../core/services/enum.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SharedModule } from '../../../shared/shared-module';
import { TableColumn } from '../../../shared/components/table/table.component';
import { SelectItem } from 'primeng/api';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable, Subscription, of } from 'rxjs';
import { filter, switchMap, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-users',
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
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit, OnDestroy {
  loading = false;
  showForm = false;
  editingUser: User | null = null;
  error: string | null = null;
  accessCredentialOptions = signal<SelectItem[]>([]);

  // Paginación
  page: number = 0;
  size: number = environment.rowsPerPage || 10;
  first = 0;

  private subscription?: Subscription;

  private tableDataSubject = new BehaviorSubject<any>({
    data: [],
    totalRecords: 0,
    isFirst: true
  });
  tableData$: Observable<any> = this.tableDataSubject.asObservable();

  // Configuración de columnas para la tabla
  cols: TableColumn[] = [
    { field: 'appUserId', header: 'ID', width: '80px' },
    { field: 'firstName', header: 'Nombre', width: '120px' },
    { field: 'secondName', header: 'Segundo Nombre', width: '150px' },
    { field: 'lastName', header: 'Apellido', width: '120px' },
    { field: 'secondLastname', header: 'Segundo Apellido', width: '150px' },
    { field: 'numberIdentity', header: 'Número Identidad', width: '150px' },
    { field: 'companyName', header: 'Empresa', width: '200px' },
    { field: 'processorId', header: 'ID Procesador', width: '150px' },
    { field: 'loginLimitDisplay', header: 'Límite Acceso', width: '150px' }
  ];

  form: FormGroup;
  searchForm: FormGroup;

  constructor(
    private userService: UserService,
    private enumService: EnumService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      firstName: ['', [Validators.required]],
      secondName: [''],
      lastName: ['', [Validators.required]],
      secondLastname: ['', [Validators.required]],
      numberIdentity: ['', [Validators.required]],
      companyCompanyId: [null],
      processorId: [''],
      accessCredential: [null],
      loginLimit: [null]
    });

    this.searchForm = this.fb.group({
      appUserId: [null],
      numberIdentity: [''],
      companyCompanyId: [null]
    });
    // Los datos se cargarán cuando la tabla dispare onTablePagination
  }

  ngOnInit(): void {
    this.loadAccessCredentialOptions();
  }

  private loadAccessCredentialOptions(): void {
    this.enumService.getEnumByName('EAccessCredential')
      .pipe(
        catchError(() => of([] as EnumResource[]))
      )
      .subscribe({
        next: (enums: EnumResource[]) => {
          const options = enums.map(enumItem => ({
            label: enumItem.description,
            value: enumItem.id
          }));
          this.accessCredentialOptions.set(options);
        }
      });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.tableDataSubject.complete();
  }

  loadUsers(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    this.loading = true;
    this.error = null;

    const filters: any = {};
    if (this.searchForm.value.appUserId) {
      filters.appUserId = this.searchForm.value.appUserId;
    }
    if (this.searchForm.value.numberIdentity?.trim()) {
      filters.numberIdentity = this.searchForm.value.numberIdentity.trim();
    }
    if (this.searchForm.value.companyCompanyId) {
      filters.companyCompanyId = this.searchForm.value.companyCompanyId;
    }

    this.subscription = this.userService.getPageable(this.page, this.size, filters)
      .subscribe({
        next: (data: UserPageResponse) => {
          // Formatear loginLimit para mostrar en la tabla
          const formattedData = (data.content || []).map(user => ({
            ...user,
            loginLimitDisplay: this.formatLoginLimit(user.loginLimit)
          }));

          this.tableDataSubject.next({
            data: formattedData,
            totalRecords: data.totalElements || 0,
            isFirst: this.page === 0
          });
          this.loading = false;
        },
        error: (err: any) => {
          this.error = err?.error?.message || err?.message || 'Error al cargar los usuarios';
          this.tableDataSubject.next({
            data: [],
            totalRecords: 0,
            isFirst: true
          });
          this.loading = false;
        }
      });
  }

  /**
   * Formatea la fecha de loginLimit para mostrarla en la tabla
   * @param loginLimit Fecha en formato string ISO (YYYY-MM-DD) o null/undefined
   * @returns Fecha formateada como dd/MM/yyyy o '-' si no hay fecha
   */
  formatLoginLimit(loginLimit: string | null | undefined): string {
    if (!loginLimit) {
      return '-';
    }

    try {
      const date = new Date(loginLimit);
      if (isNaN(date.getTime())) {
        return '-';
      }

      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();

      return `${day}/${month}/${year}`;
    } catch (error) {
      return '-';
    }
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
    this.loadUsers();
  }

  onTableEdit(selected: any): void {
    if (selected) {
      this.openEditForm(selected);
    }
  }

  onTableDelete(selected: any): void {
    if (selected && selected.numberIdentity) {
      const itemName = selected.firstName && selected.lastName
        ? `el usuario "${selected.firstName} ${selected.lastName}"`
        : 'este usuario';

      this.confirmationService.confirmDelete(itemName)
        .pipe(
          filter((confirmed: boolean) => confirmed),
          switchMap(() => {
            this.loading = true;
            return this.userService.delete(Number(selected.numberIdentity));
          })
        )
        .subscribe({
          next: () => {
            this.loading = false;
            this.loadUsers();
          },
          error: (err: any) => {
            this.error = err?.error?.message || 'Error al eliminar el usuario';
            this.loading = false;
          }
        });
    }
  }

  openCreateForm(): void {
    this.editingUser = null;
    this.form.reset();
    this.showForm = true;
  }

  openEditForm(user: User): void {
    this.editingUser = user;

    // Convertir loginLimit de string ISO a Date si existe
    let loginLimitDate: Date | null = null;
    if (user.loginLimit) {
      loginLimitDate = new Date(user.loginLimit);
    }

    // Extraer el ID del accessCredential si es un objeto EnumResource
    let accessCredentialValue: string | null = null;
    if (user.accessCredential) {
      if (typeof user.accessCredential === 'object' && 'id' in user.accessCredential) {
        accessCredentialValue = (user.accessCredential as EnumResource).id;
      } else {
        accessCredentialValue = user.accessCredential as string;
      }
    }

    this.form.patchValue({
      firstName: user.firstName || '',
      secondName: user.secondName || '',
      lastName: user.lastName || '',
      secondLastname: user.secondLastname || '',
      numberIdentity: user.numberIdentity || '',
      companyCompanyId: user.companyCompanyId || null,
      processorId: user.processorId || '',
      accessCredential: accessCredentialValue,
      loginLimit: loginLimitDate
    });
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingUser = null;
    this.form.reset();
  }

  submitForm(): void {
    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    // Convertir loginLimit de Date a string ISO si existe
    let loginLimitString: string | null = null;
    if (this.form.value.loginLimit) {
      const date = this.form.value.loginLimit as Date;
      loginLimitString = date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    }

    // Preparar accessCredential como objeto EnumResource con id
    // El backend espera EnumResource con al menos el campo id
    const accessCredentialValue = this.form.value.accessCredential;
    const accessCredential: EnumResource | null | undefined = accessCredentialValue ? {
      id: accessCredentialValue,
      description: this.accessCredentialOptions().find(opt => opt.value === accessCredentialValue)?.label || accessCredentialValue
    } : null;

    const userData: any = {
      firstName: this.form.value.firstName,
      secondName: this.form.value.secondName,
      lastName: this.form.value.lastName,
      secondLastName: this.form.value.secondLastname,
      numberIdentity: this.form.value.numberIdentity,
      companyCompanyId: this.form.value.companyCompanyId,
      processorId: this.form.value.processorId,
      accessCredential: accessCredential,
      loginLimit: loginLimitString
    };

    if (this.editingUser?.appUserId) {
      userData.appUserId = this.editingUser.appUserId;
    }

    const operation = this.editingUser?.appUserId
      ? this.userService.update(userData)
      : this.userService.create(userData);

    operation.subscribe({
      next: () => {
        this.loading = false;
        this.showForm = false;
        this.editingUser = null;
        this.form.reset();
        this.loadUsers();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error al guardar el usuario';
        this.loading = false;
      }
    });
  }
}

