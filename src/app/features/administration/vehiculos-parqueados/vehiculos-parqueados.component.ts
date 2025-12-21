import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { VehiculosParqueadosService, VehiculoParqueado, Page } from '../../../core/services/vehiculos-parqueados.service';
import { EnumService, EnumResource } from '../../../core/services/enum.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SharedModule } from '../../../shared/shared-module';
import { TableColumn } from '../../../shared/components/table/table.component';
import { SelectItem } from 'primeng/api';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable, Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

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
  statusOptions: SelectItem[] = [];

  // Cache para mapeo rápido de tipoVehiculo
  private tipoVehiculoMap = new Map<string, string>();

  // Paginación
  page: number = 0;
  size: number = environment.rowsPerPage || 10;
  first = 0;

  private subscription?: Subscription;
  private statusSubscription?: Subscription;
  private tipoVehiculoSubscription?: Subscription;
  private isInitialLoad = true;

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
    { field: 'tipoVehiculoDisplay', header: 'Tipo de Vehículo', width: '150px' },
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
    private enumService: EnumService,
    private fb: FormBuilder
  ) {
    this.searchForm = this.fb.group({
      status: [null],
      companyCompanyId: [null]
    });
  }

  ngOnInit(): void {
    // Cargar opciones de estado y tipos de vehículo desde el backend
    this.loadStatusOptions();
    this.loadTipoVehiculoOptions();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.statusSubscription) {
      this.statusSubscription.unsubscribe();
    }
    if (this.tipoVehiculoSubscription) {
      this.tipoVehiculoSubscription.unsubscribe();
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
            const openStatus = this.statusOptions.find(opt => opt.value === 'OPEN');
            if (openStatus) {
              this.searchForm.patchValue({ status: openStatus.value });
            }
          }
        }
      });
  }

  private loadTipoVehiculoOptions(): void {
    this.tipoVehiculoSubscription = this.enumService.getEnumByName('ETipoVehiculo')
      .pipe(
        catchError(() => of([] as EnumResource[]))
      )
      .subscribe({
        next: (tipos: EnumResource[]) => {
          // Crear mapa para acceso rápido
          this.tipoVehiculoMap.clear();
          tipos.forEach(tipo => {
            this.tipoVehiculoMap.set(tipo.id, tipo.description || tipo.id);
          });
        }
      });
  }

  loadVehiculos(): void {
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

    this.subscription = this.vehiculosParqueadosService
      .getPageable(this.page, this.size, filters)
      .subscribe({
        next: (response: Page<VehiculoParqueado>) => {
          // Formatear status y tipoVehiculo para mostrar en la tabla
          const formattedData = (response.content || []).map(item => ({
            ...item,
            statusDisplay: this.formatStatus(item.status),
            tipoVehiculoDisplay: this.getTipoVehiculoDescription(item.tipoVehiculo)
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
    this.isInitialLoad = false; // Marcar que ya no es carga inicial
    // Llamar directamente a loadVehiculos para forzar la recarga con los nuevos filtros
    this.loadVehiculos();
  }

  clearSearch(): void {
    // Establecer valor por defecto si hay opciones
    const defaultStatus = this.statusOptions.find(opt => opt.value === 'OPEN')?.value || null;
    this.searchForm.reset({
      status: defaultStatus,
      companyCompanyId: null
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
      this.loadVehiculos();
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
   * OPEN -> "Dentro del parqueadero"
   * CLOSED -> "Cobrada"
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
      case 'OPEN':
        return 'Dentro del parqueadero';
      case 'CLOSED':
        return 'Cobrada';
      default:
        return statusValue;
    }
  }

  /**
   * Obtiene la descripción del tipo de vehículo desde el mapa cacheado
   */
  getTipoVehiculoDescription(tipoVehiculo: string | EnumResource | null | undefined): string {
    if (!tipoVehiculo) return '-';

    // Si es un objeto EnumResource, usar description o id
    if (typeof tipoVehiculo === 'object' && tipoVehiculo !== null) {
      return tipoVehiculo.description || tipoVehiculo.id || '-';
    }

    // Si es string, buscar en el mapa
    const tipoVehiculoId = tipoVehiculo;
    return this.tipoVehiculoMap.get(tipoVehiculoId) || tipoVehiculoId || '-';
  }
}

