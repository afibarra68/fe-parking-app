import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ClosedTransactionsService, ClosedTransaction, Page } from '../../../core/services/closed-transactions.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SharedModule } from '../../../shared/shared-module';
import { TableColumn } from '../../../shared/components/table/table.component';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';

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
export class ClosedTransactionsComponent implements OnDestroy {
  loading = false;
  error: string | null = null;
  
  // Paginación
  page: number = 0;
  size: number = environment.rowsPerPage || 10;
  first = 0;
  
  private subscription?: Subscription;
  private todayOnlySubscription?: Subscription;
  
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
    private fb: FormBuilder
  ) {
    this.searchForm = this.fb.group({
      status: ['CLOSED'],
      companyCompanyId: [null],
      todayOnly: [true] // Habilitado por defecto
    });
    
    // Recargar datos cuando cambie el checkbox
    this.todayOnlySubscription = this.searchForm.get('todayOnly')?.valueChanges.subscribe(() => {
      this.page = 0;
      this.first = 0;
      this.loadClosedTransactions();
    });
    
    // Los datos se cargarán cuando la tabla dispare onTablePagination
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.todayOnlySubscription) {
      this.todayOnlySubscription.unsubscribe();
    }
  }

  loadClosedTransactions(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    this.loading = true;
    this.error = null;

    const filters: any = {};
    if (this.searchForm.value.status) {
      filters.status = this.searchForm.value.status;
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
    this.onTablePagination({ page: 0, first: 0, rows: this.size, pageCount: 0 });
  }

  clearSearch(): void {
    this.searchForm.reset({
      status: 'CLOSED',
      companyCompanyId: null,
      todayOnly: true // Mantener el checkbox marcado por defecto
    });
    this.search();
  }

  onTablePagination(event: any): void {
    this.page = event.page || 0;
    this.size = event.rows || environment.rowsPerPage || 10;
    this.first = event.first || 0;
    this.loadClosedTransactions();
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
   */
  formatStatus(status: string | undefined): string {
    if (!status) return '';
    switch (status.toUpperCase()) {
      case 'CLOSED':
        return 'Cobrada';
      default:
        return status;
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

