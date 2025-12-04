import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { VehiculosParqueadosService, VehiculoParqueado, Page } from '../../../core/services/vehiculos-parqueados.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SharedModule } from '../../../shared/shared-module';
import { TableColumn } from '../../../shared/components/table/table.component';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-vehiculos-parqueados',
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
  templateUrl: './vehiculos-parqueados.component.html',
  styleUrls: ['./vehiculos-parqueados.component.scss']
})
export class VehiculosParqueadosComponent implements OnDestroy {
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
    { field: 'openTransactionId', header: 'ID', width: '80px' },
    { field: 'vehiclePlate', header: 'Placa', width: '120px' },
    { field: 'tipoVehiculo', header: 'Tipo de Vehículo', width: '150px' },
    { field: 'startDay', header: 'Fecha Inicio', width: '120px' },
    { field: 'startTime', header: 'Hora Inicio', width: '120px' },
    { field: 'statusDisplay', header: 'Estado', width: '150px' },
    { field: 'timeElapsed', header: 'Tiempo Transcurrido', width: '150px' },
    { field: 'companyCompanyId', header: 'ID Empresa', width: '120px' },
    { field: 'operationDate', header: 'Fecha Operación', width: '150px' }
  ];

  searchForm: FormGroup;

  constructor(
    private vehiculosParqueadosService: VehiculosParqueadosService,
    private fb: FormBuilder
  ) {
    this.searchForm = this.fb.group({
      status: ['OPEN'],
      companyCompanyId: [null]
    });
    // Los datos se cargarán cuando la tabla dispare onTablePagination
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  loadVehiculos(): void {
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

    this.subscription = this.vehiculosParqueadosService
      .getPageable(this.page, this.size, filters)
      .subscribe({
        next: (response: Page<VehiculoParqueado>) => {
          // Formatear status para mostrar en la tabla
          const formattedData = (response.content || []).map(item => ({
            ...item,
            statusDisplay: this.formatStatus(item.status)
          }));
          this.tableDataSubject.next({
            data: formattedData,
            totalRecords: response.totalElements || 0,
            isFirst: this.page === 0
          });
          this.loading = false;
        },
        error: (err: any) => {
          this.error = err?.error?.message || err?.message || 'Error al cargar vehículos parqueados';
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
      status: 'OPEN',
      companyCompanyId: null
    });
    this.search();
  }

  onTablePagination(event: any): void {
    this.page = event.page || 0;
    this.size = event.rows || environment.rowsPerPage || 10;
    this.first = event.first || 0;
    this.loadVehiculos();
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
   * OPEN -> "Dentro del parqueadero"
   * CLOSED -> "Cobrada"
   */
  formatStatus(status: string | undefined): string {
    if (!status) return '';
    switch (status.toUpperCase()) {
      case 'OPEN':
        return 'Dentro del parqueadero';
      case 'CLOSED':
        return 'Cobrada';
      default:
        return status;
    }
  }
}

