import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UserPrinterTypeService, UserPrinterType, UserPrinterTypePageResponse } from '../../../core/services/user-printer-type.service';
import { UserService, User } from '../../../core/services/user.service';
import { PrinterService } from '../../../core/services/printer.service';
import { EnumService, EnumResource } from '../../../core/services/enum.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { CheckboxModule } from 'primeng/checkbox';
import { SharedModule } from '../../../shared/shared-module';
import { TableColumn } from '../../../shared/components/table/table.component';
import { environment } from '../../../../environments/environment';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { SelectItem } from 'primeng/api';
import { filter, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-user-printer-types',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    MessageModule,
    CheckboxModule,
    SharedModule
  ],
  templateUrl: './user-printer-types.component.html',
  styleUrls: ['./user-printer-types.component.scss']
})
export class UserPrinterTypesComponent implements OnInit, OnDestroy {
  loading = false;
  showForm = false;
  editingUserPrinterType: UserPrinterType | null = null;
  error: string | null = null;

  // Paginación
  page: number = 0;
  size: number = environment.rowsPerPage || 10;
  first = 0;

  private subscription?: Subscription;

  // Opciones para selects
  userOptions: SelectItem[] = [];
  printerTypes: SelectItem[] = [];

  // Configuración de columnas para la tabla
  cols: TableColumn[] = [
    { field: 'userPrinterTypeId', header: 'ID', width: '80px' },
    { field: 'userName', header: 'Usuario', width: '200px' },
    { field: 'printerTypeDisplay', header: 'Tipo Impresora', width: '150px' },
    { field: 'isEnabled', header: 'Habilitado', width: '120px' }
  ];

  private tableDataSubject = new BehaviorSubject<any>({
    data: [],
    totalRecords: 0,
    isFirst: true
  });
  tableData$: Observable<any> = this.tableDataSubject.asObservable();

  form: FormGroup;
  searchForm: FormGroup;

  constructor(
    private userPrinterTypeService: UserPrinterTypeService,
    private userService: UserService,
    private printerService: PrinterService,
    private enumService: EnumService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      userUserId: [null, [Validators.required]],
      printerType: ['', [Validators.required]],
      isEnabled: [true]
    });

    this.searchForm = this.fb.group({
      userUserId: [null],
      printerType: [''],
      isEnabled: [null]
    });
  }

  ngOnInit(): void {
    this.loadPrinterTypes();
    this.loadUsers();
    this.loadUserPrinterTypes();
  }

  loadPrinterTypes(): void {
    this.enumService.getEnumByName('EPrinterType').subscribe({
      next: (types: EnumResource[]) => {
        this.printerTypes = types.map(type => ({
          label: type.description || type.id,
          value: type.id
        }));
      },
      error: (err: any) => {
        console.error('Error al cargar tipos de impresora:', err);
        // Fallback a valores hardcodeados si falla
        this.printerTypes = [
          { label: 'COM', value: 'COM' },
          { label: 'WINDOWS', value: 'WINDOWS' },
          { label: 'NETWORK', value: 'NETWORK' }
        ];
      }
    });
  }

  loadUsers(): void {
    this.userService.getPageable(0, 1000).subscribe({
      next: (data) => {
        this.userOptions = data.content.map(user => ({
          label: `${user.firstName || ''} ${user.lastName || ''} (${user.numberIdentity || ''})`.trim(),
          value: user.appUserId
        }));
      },
      error: (err) => {
        this.error = 'Error al cargar usuarios';
        console.error(err);
      }
    });
  }

  loadUserPrinterTypes(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    this.loading = true;
    this.error = null;

    const filters: any = {
      userUserId: this.searchForm.value.userUserId || undefined,
      printerType: this.searchForm.value.printerType || undefined,
      isEnabled: this.searchForm.value.isEnabled !== null ? this.searchForm.value.isEnabled : undefined
    };

    this.subscription = this.userPrinterTypeService.getPageable(this.page, this.size, filters)
      .subscribe({
        next: (data: UserPrinterTypePageResponse) => {
          // Enriquecer datos con nombres y formatear printerType
          const enrichedData = data.content.map(item => ({
            ...item,
            userName: this.getUserName(item.userUserId),
            printerTypeDisplay: this.getPrinterTypeDisplay(item.printerType)
          }));

          this.tableDataSubject.next({
            data: enrichedData,
            totalRecords: data.totalElements,
            isFirst: this.page === 0
          });
          this.loading = false;
        },
        error: (err: any) => {
          this.error = err?.error?.message || err?.message || 'Error al cargar los tipos de impresora habilitados';
          this.tableDataSubject.next({
            data: [],
            totalRecords: 0,
            isFirst: true
          });
          this.loading = false;
        }
      });
  }

  getUserName(userId?: number): string {
    if (!userId) return '';
    const user = this.userOptions.find(u => u.value === userId);
    return user?.label || '';
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.tableDataSubject.complete();
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

  openCreateForm(): void {
    this.editingUserPrinterType = null;
    this.form.reset();
    this.form.patchValue({ isEnabled: true });
    this.showForm = true;
  }

  openEditForm(userPrinterType: UserPrinterType): void {
    this.editingUserPrinterType = userPrinterType;
    this.form.patchValue({
      userUserId: userPrinterType.userUserId || null,
      printerType: userPrinterType.printerType || '',
      isEnabled: userPrinterType.isEnabled !== undefined ? userPrinterType.isEnabled : true
    });
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingUserPrinterType = null;
    this.form.reset();
  }

  submitForm(): void {
    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    const userPrinterTypeData: UserPrinterType = {
      ...this.form.value
    };

    if (this.editingUserPrinterType?.userPrinterTypeId) {
      userPrinterTypeData.userPrinterTypeId = this.editingUserPrinterType.userPrinterTypeId;
    }

    const operation = this.editingUserPrinterType
      ? this.userPrinterTypeService.update(userPrinterTypeData)
      : this.userPrinterTypeService.create(userPrinterTypeData);

    operation.subscribe({
      next: () => {
        this.loading = false;
        this.showForm = false;
        this.editingUserPrinterType = null;
        this.form.reset();
        this.loadUserPrinterTypes();
      },
      error: (err: any) => {
        this.error = err?.error?.message || 'Error al guardar el tipo de impresora habilitado';
        this.loading = false;
      }
    });
  }

  onTableEdit(selected: any): void {
    if (selected) {
      this.openEditForm(selected);
    }
  }

  onTableDelete(selected: any): void {
    if (selected && selected.userPrinterTypeId) {
      this.confirmationService.confirmDelete('este tipo de impresora habilitado')
        .pipe(
          filter((confirmed: boolean) => confirmed),
          switchMap(() => {
            this.loading = true;
            return this.userPrinterTypeService.delete(selected.userPrinterTypeId);
          })
        )
        .subscribe({
          next: () => {
            this.loading = false;
            this.loadUserPrinterTypes();
          },
          error: (err: any) => {
            this.error = err?.error?.message || 'Error al eliminar el tipo de impresora habilitado';
            this.loading = false;
          }
        });
    }
  }

  onTablePagination(event: any): void {
    this.page = event.page || 0;
    this.size = event.rows || environment.rowsPerPage || 10;
    this.first = event.first || 0;
    this.loadUserPrinterTypes();
  }

  getPrinterTypeDisplay(printerType: string | undefined): string {
    if (!printerType) return '';
    // Buscar la descripción en printerTypes
    const typeOption = this.printerTypes.find(t => t.value === printerType);
    return typeOption?.label || printerType;
  }
}

