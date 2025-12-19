import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ClosedTransactionsService, ClosedTransaction, Page } from '../../../core/services/closed-transactions.service';
import { EnumService, EnumResource } from '../../../core/services/enum.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SharedModule } from '../../../shared/shared-module';
import { TableColumn } from '../../../shared/components/table/table.component';
import { SelectItem } from 'primeng/api';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable, Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-closed-transactions',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    CheckboxModule,
    DialogModule,
    MessageModule,
    SharedModule
  ],
  templateUrl: './closed-transactions.component.html',
  styleUrls: ['./closed-transactions.component.scss']
})
export class ClosedTransactionsComponent implements OnInit, OnDestroy {
  loading = false;
  error: string | null = null;
  statusOptions: SelectItem[] = [];

  // Paginación
  page: number = 0;
  size: number = environment.rowsPerPage || 10;
  first = 0;

  private subscription?: Subscription;
  private statusSubscription?: Subscription;
  private isInitialLoad = true;

  private tableDataSubject = new BehaviorSubject<any>({
    data: [],
    totalRecords: 0,
    isFirst: true
  });
  tableData$: Observable<any> = this.tableDataSubject.asObservable();

  // Configuración de columnas para la tabla
  cols: TableColumn[] = [
    { field: 'closedTransactionId', header: 'ID', width: '80px' },
    { field: 'startDay', header: 'Fecha Inicio', width: '120px' },
    { field: 'startTime', header: 'Hora Inicio', width: '120px' },
    { field: 'endTime', header: 'Fecha Fin', width: '120px' },
    { field: 'endDate', header: 'Hora Fin', width: '120px' },
    { field: 'statusDisplay', header: 'Estado', width: '120px' },
    { field: 'totalAmountFormatted', header: 'Total', width: '150px' },
    { field: 'timeElapsed', header: 'Tiempo Transcurrido', width: '150px' },
    { field: 'sellerName', header: 'Vendedor', width: '150px' },
    { field: 'operationDate', header: 'Fecha Operación', width: '150px' }
  ];

  searchForm: FormGroup;

  constructor(
    private closedTransactionsService: ClosedTransactionsService,
    private enumService: EnumService,
    private fb: FormBuilder
  ) {
    this.searchForm = this.fb.group({
      status: [null],
      companyCompanyId: [null],
      todayOnly: [true] // Habilitado por defecto
    });
  }

  ngOnInit(): void {
    // Cargar opciones de estado desde el backend
    this.loadStatusOptions();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.statusSubscription) {
      this.statusSubscription.unsubscribe();
    }
  }

  private loadStatusOptions(): void {
    this.statusSubscription = this.enumService.getEnumByName('EtransactionStatus')
      .pipe(
        catchError(() => of([] as EnumResource[]))
      )
      .subscribe({
        next: (statuses: EnumResource[]) => {
          this.statusOptions = statuses.map(status => ({
            label: status.description,
            value: status.id
          }));
          // Establecer valor por defecto si hay opciones
          if (this.statusOptions.length > 0 && !this.searchForm.value.status) {
            const closedStatus = this.statusOptions.find(opt => opt.value === 'CLOSED');
            if (closedStatus) {
              this.searchForm.patchValue({ status: closedStatus.value });
            }
          }
        }
      });
  }

  loadClosedTransactions(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    this.loading = true;
    this.error = null;

    // Extraer el ID del status si es un objeto EnumResource
    const statusValue = this.searchForm.value.status;
    const statusId = typeof statusValue === 'object' && statusValue?.id
      ? statusValue.id
      : (typeof statusValue === 'string' ? statusValue : undefined);

    const filters: any = {};
    if (statusId) {
      filters.status = statusId;
    }
    if (this.searchForm.value.companyCompanyId) {
      filters.companyCompanyId = this.searchForm.value.companyCompanyId;
    }
    // Si el checkbox está marcado, filtrar solo transacciones del día de hoy
    if (this.searchForm.value.todayOnly) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      filters.operationDateFrom = today.toISOString().split('T')[0];
      filters.operationDateTo = tomorrow.toISOString().split('T')[0];
    }

    this.subscription = this.closedTransactionsService
      .getPageable(this.page, this.size, filters)
      .subscribe({
        next: (response: Page<ClosedTransaction>) => {
          // Formatear status y totalAmount para mostrar en la tabla
          const formattedData = (response.content || []).map(item => ({
            ...item,
            statusDisplay: this.formatStatus(item.status),
            totalAmountFormatted: this.formatCurrency(item.totalAmount, item.countryCurrency)
          }));
          this.tableDataSubject.next({
            data: formattedData,
            totalRecords: response.totalElements || 0,
            isFirst: this.page === 0
          });
          this.loading = false;
        },
        error: (err: any) => {
          this.error = err?.error?.message || err?.message || 'Error al cargar transacciones cerradas';
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
    this.isInitialLoad = false;
    // Llamar directamente a loadClosedTransactions para forzar la recarga con los nuevos filtros
    this.loadClosedTransactions();
  }

  clearSearch(): void {
    // Establecer valor por defecto si hay opciones
    const defaultStatus = this.statusOptions.find(opt => opt.value === 'CLOSED')?.value || null;
    this.searchForm.reset({
      status: defaultStatus,
      companyCompanyId: null,
      todayOnly: true // Mantener el checkbox marcado por defecto
    });
    this.search();
  }

  onTablePagination(event: any): void {
    // Solo cargar si no es la carga inicial o si realmente cambió la paginación
    const newPage = event.page || 0;
    const newSize = event.rows || environment.rowsPerPage || 10;

    // Si es la primera carga o cambió la página/tamaño, cargar datos
    if (this.isInitialLoad || newPage !== this.page || newSize !== this.size) {
      this.page = newPage;
      this.size = newSize;
      this.first = event.first || 0;
      this.isInitialLoad = false;
      this.loadClosedTransactions();
    }
  }

  onTableEdit(row: any): void {
    // Lógica para editar si es necesario
    console.log('Editar:', row);
  }

  onTableDelete(row: any): void {
    // Lógica para eliminar si es necesario
    console.log('Eliminar:', row);
  }

  /**
   * Formatea el status para mostrar en la tabla
   * CLOSED -> "Cobrada"
   * OPEN -> "Operación Abierta"
   */
  formatStatus(status: EnumResource | string | undefined | null): string {
    if (!status) return '';

    // Si es un objeto EnumResource, usar description o id
    let statusValue: string;
    if (typeof status === 'object' && status !== null) {
      statusValue = status.description || status.id || '';
    } else {
      statusValue = status;
    }

    if (!statusValue) return '';

    switch (statusValue.toUpperCase()) {
      case 'CLOSED':
        return 'Cobrada';
      case 'OPEN':
        return 'Operación Abierta';
      default:
        return statusValue;
    }
  }

  /**
   * Formatea el totalAmount como moneda usando el código de moneda del país.
   * La simbología se maneja completamente en el frontend usando Intl.NumberFormat.
   */
  formatCurrency(amount: number | undefined, currencyCode: string | undefined): string {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '-';
    }

    // Obtener el locale del navegador o usar español por defecto
    const locale = navigator.language || 'es-ES';

    // Si no hay código de moneda, usar formato por defecto con USD
    if (!currencyCode || currencyCode.trim() === '') {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    }

    // Normalizar el código de moneda (mayúsculas, sin espacios)
    const normalizedCurrency = currencyCode.trim().toUpperCase();

    try {
      // Formatear con el código de moneda proporcionado
      // Intl.NumberFormat maneja automáticamente la simbología según el código
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: normalizedCurrency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      // Si el código de moneda no es válido para Intl, usar formato simple
      // El frontend maneja la simbología manualmente
      return this.formatCurrencyFallback(amount, normalizedCurrency);
    }
  }

  /**
   * Formatea moneda cuando el código no es reconocido por Intl.NumberFormat
   * Maneja la simbología manualmente en el frontend
   */
  private formatCurrencyFallback(amount: number, currencyCode: string): string {
    // Mapa de códigos de moneda comunes a sus símbolos
    const currencySymbols: { [key: string]: string } = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CNY': '¥',
      'COP': '$',
      'MXN': '$',
      'ARS': '$',
      'BRL': 'R$',
      'CLP': '$',
      'PEN': 'S/',
      'UYU': '$U',
      'VES': 'Bs.',
      'DOP': 'RD$',
      'GTQ': 'Q',
      'HNL': 'L',
      'NIO': 'C$',
      'PAB': 'B/.',
      'PYG': '₲',
      'CRC': '₡',
      'SVC': '₡'
    };

    const symbol = currencySymbols[currencyCode] || currencyCode;
    const formattedAmount = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    // Formato: símbolo + espacio + monto (ej: "$ 1,234.56" o "€ 1,234.56")
    return `${symbol} ${formattedAmount}`;
  }
}

