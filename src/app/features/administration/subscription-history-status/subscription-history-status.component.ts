import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  SubscriptionHistoryStatusService,
  SubscriptionHistoryStatus,
  Page
} from '../../../core/services/subscription-history-status.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SharedModule } from '../../../shared/shared-module';
import { TableColumn } from '../../../shared/components/table/table.component';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-subscription-history-status',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
    SharedModule
  ],
  templateUrl: './subscription-history-status.component.html',
  styleUrls: ['./subscription-history-status.component.scss']
})
export class SubscriptionHistoryStatusComponent implements OnInit, OnDestroy {
  loading = false;
  error: string | null = null;

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
    { field: 'sid', header: 'ID', width: '80px' },
    { field: 'clientFullName', header: 'Cliente', width: '200px' },
    { field: 'clientNumberIdentity', header: 'Número Identidad', width: '150px' },
    { field: 'plates', header: 'Placas', width: '200px' },
    { field: 'liquidationStatusDisplay', header: 'Estado Liquidación', width: '150px' },
    { field: 'liquidationDateDisplay', header: 'Fecha Liquidación', width: '150px' },
    { field: 'destinationEmail', header: 'Email Destino', width: '200px' },
    { field: 'createdAtDisplay', header: 'Fecha Creación', width: '150px' }
  ];

  searchForm: FormGroup;

  constructor(
    private subscriptionHistoryStatusService: SubscriptionHistoryStatusService,
    private confirmationService: ConfirmationService,
    private notificationService: NotificationService,
    private fb: FormBuilder
  ) {
    this.searchForm = this.fb.group({
      clientId: [null],
      numberIdentity: ['']
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.tableDataSubject.complete();
  }

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    this.loading = true;
    this.error = null;

    const filters: any = {};
    if (this.searchForm.value.clientId) {
      filters.clientId = this.searchForm.value.clientId;
    }
    if (this.searchForm.value.numberIdentity?.trim()) {
      filters.numberIdentity = this.searchForm.value.numberIdentity.trim();
    }

    this.subscription = this.subscriptionHistoryStatusService
      .getPageable(this.page, this.size, filters)
      .subscribe({
        next: (data: Page<SubscriptionHistoryStatus>) => {
          const mappedData = data.content.map((item) => ({
            ...item,
            liquidationStatusDisplay: this.getLiquidationStatusDescription(
              item.liquidationStatus
            ),
            liquidationDateDisplay: this.formatDate(item.liquidationDate),
            createdAtDisplay: this.formatDateTime(item.createdAt)
          }));

          this.tableDataSubject.next({
            data: mappedData,
            totalRecords: data.totalElements,
            isFirst: this.page === 0
          });
          this.loading = false;
        },
        error: (err: any) => {
          this.error =
            err?.error?.message ||
            err?.message ||
            'Error al cargar el historial de suscripciones';
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
    this.loadHistory();
  }

  onTableLiquidate(selected: any): void {
    if (!selected || !selected.sid) {
      return;
    }

    // Verificar si puede ser liquidada
    if (!this.canLiquidate(selected)) {
      this.notificationService.warn(
        'Esta suscripción ya está liquidada o no puede ser liquidada',
        'Advertencia'
      );
      return;
    }

    const itemName = selected.clientFullName
      ? `la suscripción de "${selected.clientFullName}"`
      : 'esta suscripción';

    this.confirmationService
      .confirm({
        message: `¿Está seguro de liquidar ${itemName}?`,
        header: 'Confirmar Liquidación',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Liquidar',
        rejectLabel: 'Cancelar'
      })
      .pipe(filter((confirmed: boolean) => confirmed))
      .subscribe(() => {
        this.loading = true;
        this.subscriptionHistoryStatusService.liquidate(selected.sid).subscribe({
          next: () => {
            this.loading = false;
            this.notificationService.success(
              'Suscripción liquidada exitosamente',
              'Liquidación Exitosa'
            );
            this.loadHistory();
          },
          error: (err) => {
            this.loading = false;
            this.notificationService.error(
              err?.error?.message || 'Error al liquidar la suscripción',
              'Error'
            );
          }
        });
      });
  }

  /**
   * Obtiene la descripción del estado de liquidación
   */
  getLiquidationStatusDescription(
    status: any
  ): string {
    if (!status) {
      return '-';
    }

    if (typeof status === 'object' && status !== null) {
      return status.description || status.id || '-';
    }

    switch (status.toUpperCase()) {
      case 'PENDING':
        return 'Pendiente';
      case 'LIQUIDATED':
        return 'Liquidada';
      default:
        return status;
    }
  }

  /**
   * Formatea una fecha ISO string a formato dd/MM/yyyy
   */
  formatDate(dateString: string | undefined | null): string {
    if (!dateString) {
      return '-';
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Formatea una fecha y hora ISO string a formato dd/MM/yyyy HH:mm
   */
  formatDateTime(dateTimeString: string | undefined | null): string {
    if (!dateTimeString) {
      return '-';
    }
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) {
      return dateTimeString;
    }
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  /**
   * Verifica si una suscripción puede ser liquidada (solo si está pendiente)
   */
  canLiquidate(item: any): boolean {
    if (!item || !item.liquidationStatus) {
      return false;
    }
    const status =
      typeof item.liquidationStatus === 'object'
        ? item.liquidationStatus.id
        : item.liquidationStatus;
    return status?.toUpperCase() === 'PENDING';
  }
}
