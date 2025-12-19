import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UserPrinterService, UserPrinter, UserPrinterPageResponse } from '../../../core/services/user-printer.service';
import { UserService, User } from '../../../core/services/user.service';
import { PrinterService, Printer } from '../../../core/services/printer.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { CheckboxModule } from 'primeng/checkbox';
import { SharedModule } from '../../../shared/shared-module';
import { TableColumn } from '../../../shared/components/table/table.component';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable, Subscription, forkJoin } from 'rxjs';
import { SelectItem } from 'primeng/api';
import { filter, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-user-printers',
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
  templateUrl: './user-printers.component.html',
  styleUrls: ['./user-printers.component.scss']
})
export class UserPrintersComponent implements OnInit, OnDestroy {
  loading = false;
  showForm = false;
  editingUserPrinter: UserPrinter | null = null;
  error: string | null = null;
  
  // Paginación
  page: number = 0;
  size: number = environment.rowsPerPage || 10;
  first = 0;
  
  private subscription?: Subscription;

  // Opciones para selects
  userOptions: SelectItem[] = [];
  printerOptions: SelectItem[] = [];

  // Configuración de columnas para la tabla
  cols: TableColumn[] = [
    { field: 'userPrinterId', header: 'ID', width: '80px' },
    { field: 'userName', header: 'Usuario', width: '200px' },
    { field: 'printerName', header: 'Impresora', width: '200px' },
    { field: 'isActive', header: 'Activo', width: '100px' }
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
    private userPrinterService: UserPrinterService,
    private userService: UserService,
    private printerService: PrinterService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      userUserId: [null, [Validators.required]],
      printerPrinterId: [null, [Validators.required]],
      isActive: [true]
    });

    this.searchForm = this.fb.group({
      userUserId: [null],
      printerPrinterId: [null],
      isActive: [null]
    });
  }

  ngOnInit(): void {
    this.loadUsersAndPrinters();
    this.loadUserPrinters();
  }

  loadUsersAndPrinters(): void {
    forkJoin({
      users: this.userService.getPageable(0, 1000),
      printers: this.printerService.getPageable(0, 1000)
    }).subscribe({
      next: (data) => {
        this.userOptions = data.users.content.map(user => ({
          label: `${user.firstName || ''} ${user.lastName || ''} (${user.numberIdentity || ''})`.trim(),
          value: user.appUserId
        }));

        this.printerOptions = data.printers.content.map(printer => ({
          label: `${printer.printerName || ''} (${printer.printerType || ''})`.trim(),
          value: printer.printerId
        }));
      },
      error: (err) => {
        this.error = 'Error al cargar usuarios e impresoras';
        console.error(err);
      }
    });
  }

  loadUserPrinters(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    this.loading = true;
    this.error = null;
    
    const filters: any = {
      userUserId: this.searchForm.value.userUserId || undefined,
      printerPrinterId: this.searchForm.value.printerPrinterId || undefined,
      isActive: this.searchForm.value.isActive !== null ? this.searchForm.value.isActive : undefined
    };
    
    this.subscription = this.userPrinterService.getPageable(this.page, this.size, filters)
      .subscribe({
        next: (data: UserPrinterPageResponse) => {
          // Enriquecer datos con nombres
          const enrichedData = data.content.map(item => ({
            ...item,
            userName: this.getUserName(item.userUserId),
            printerName: this.getPrinterName(item.printerPrinterId)
          }));

          this.tableDataSubject.next({
            data: enrichedData,
            totalRecords: data.totalElements,
            isFirst: this.page === 0
          });
          this.loading = false;
        },
        error: (err: any) => {
          this.error = err?.error?.message || err?.message || 'Error al cargar las relaciones usuario-impresora';
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

  getPrinterName(printerId?: number): string {
    if (!printerId) return '';
    const printer = this.printerOptions.find(p => p.value === printerId);
    return printer?.label || '';
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
    this.editingUserPrinter = null;
    this.form.reset();
    this.form.patchValue({ isActive: true });
    this.showForm = true;
  }

  openEditForm(userPrinter: UserPrinter): void {
    this.editingUserPrinter = userPrinter;
    this.form.patchValue({
      userUserId: userPrinter.userUserId || null,
      printerPrinterId: userPrinter.printerPrinterId || null,
      isActive: userPrinter.isActive !== undefined ? userPrinter.isActive : true
    });
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingUserPrinter = null;
    this.form.reset();
  }

  submitForm(): void {
    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    const userPrinterData: UserPrinter = {
      ...this.form.value
    };

    if (this.editingUserPrinter?.userPrinterId) {
      userPrinterData.userPrinterId = this.editingUserPrinter.userPrinterId;
    }

    const operation = this.editingUserPrinter
      ? this.userPrinterService.update(userPrinterData)
      : this.userPrinterService.create(userPrinterData);

    operation.subscribe({
      next: () => {
        this.loading = false;
        this.showForm = false;
        this.editingUserPrinter = null;
        this.form.reset();
        this.loadUserPrinters();
      },
      error: (err: any) => {
        this.error = err?.error?.message || 'Error al guardar la relación usuario-impresora';
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
    if (selected && selected.userPrinterId) {
      this.confirmationService.confirmDelete('esta relación')
        .pipe(
          filter((confirmed: boolean) => confirmed),
          switchMap(() => {
            this.loading = true;
            return this.userPrinterService.delete(selected.userPrinterId);
          })
        )
        .subscribe({
          next: () => {
            this.loading = false;
            this.loadUserPrinters();
          },
          error: (err: any) => {
            this.error = err?.error?.message || 'Error al eliminar la relación';
            this.loading = false;
          }
        });
    }
  }

  onTablePagination(event: any): void {
    this.page = event.page || 0;
    this.size = event.rows || environment.rowsPerPage || 10;
    this.first = event.first || 0;
    this.loadUserPrinters();
  }
}

