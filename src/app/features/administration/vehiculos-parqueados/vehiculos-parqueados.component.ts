import { Component, OnDestroy, OnInit } from '@angular/core';
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
export class VehiculosParqueadosComponent implements OnInit, OnDestroy {
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
    { field: 'startDay', header: 'Fecha Inicio', width: '120px' },
    { field: 'startTime', header: 'Hora Inicio', width: '120px' },
    { field: 'status', header: 'Estado', width: '100px' },
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
  }

  ngOnInit(): void {
    this.loadVehiculos();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  loadVehiculos(): void {
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
          this.loading = false;
          this.tableDataSubject.next({
            data: response.content || [],
            totalRecords: response.totalElements || 0,
            isFirst: response.first
          });
        },
        error: (err) => {
          this.loading = false;
          this.error = err?.error?.message || 'Error al cargar vehículos parqueados';
        }
      });
  }

  search(): void {
    this.page = 0;
    this.first = 0;
    this.loadVehiculos();
  }

  clearSearch(): void {
    this.searchForm.reset({
      status: 'OPEN',
      companyCompanyId: null
    });
    this.page = 0;
    this.first = 0;
    this.loadVehiculos();
  }

  onTablePagination(event: any): void {
    this.page = event.page;
    this.first = event.first;
    this.size = event.rows;
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
}

