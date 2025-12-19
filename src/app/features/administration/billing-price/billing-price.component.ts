import { Component, signal, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { BillingPriceService, BillingPrice, BillingPricePageResponse } from '../../../core/services/billing-price.service';
import { CompanyService, Company } from '../../../core/services/company.service';
import { TipoVehiculoService, TipoVehiculo } from '../../../core/services/tipo-vehiculo.service';
import { CompanyBusinessServiceService, CompanyBusinessService } from '../../../core/services/company-business-service.service';
import { EnumResource } from '../../../core/services/enum.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SharedModule } from '../../../shared/shared-module';
import { TableColumn } from '../../../shared/components/table/table.component';
import { SelectItem } from 'primeng/api';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, shareReplay } from 'rxjs/operators';

@Component({
  selector: 'app-billing-price',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    DialogModule,
    MessageModule,
    SharedModule
  ],
  templateUrl: './billing-price.component.html',
  styleUrls: ['./billing-price.component.scss']
})
export class BillingPriceComponent implements OnInit {
  private destroyRef = inject(DestroyRef);

  // Signals para mejor rendimiento y reactividad
  loading = signal(false);
  showForm = signal(false);
  editingBillingPrice = signal<BillingPrice | null>(null);
  error = signal<string | null>(null);
  companyOptions = signal<SelectItem[]>([]);
  tipoVehiculoOptions = signal<SelectItem[]>([]);
  businessServiceOptions = signal<SelectItem[]>([]);
  currentCompanyId = signal<number | null>(null);

  // Cache para mapeo rápido de tipoVehiculo
  private tipoVehiculoMap = new Map<string, string>();

  // Paginación
  page = signal(0);
  size = signal(environment.rowsPerPage || 10);
  first = signal(0);

  private tableDataSubject = new BehaviorSubject<any>({
    data: [],
    totalRecords: 0,
    isFirst: true
  });
  tableData$: Observable<any> = this.tableDataSubject.asObservable();

  // Configuración de columnas para la tabla
  cols: TableColumn[] = [
    { field: 'billingPriceId', header: 'ID', width: '80px' },
    { field: 'status', header: 'Estado', width: '120px' },
    { field: 'coverType', header: 'Tipo de Cobertura', width: '150px' },
    { field: 'tipoVehiculoDisplay', header: 'Tipo de Vehículo', width: '150px' },
    { field: 'start', header: 'Inicio (horas)', width: '120px' },
    { field: 'end', header: 'Fin (horas)', width: '120px' },
    { field: 'mount', header: 'Valor por hora', width: '120px' },
    { field: 'applyDiscount', header: 'Aplica Descuento', width: '150px' }
  ];

  form: FormGroup;
  searchForm: FormGroup;

  constructor(
    private billingPriceService: BillingPriceService,
    private companyService: CompanyService,
    private tipoVehiculoService: TipoVehiculoService,
    private companyBusinessServiceService: CompanyBusinessServiceService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      status: [''],
      coverType: [''],
      applyDiscount: [false],
      discountDiscountId: [null],
      companyCompanyId: [null],
      businessServiceBusinessServiceId: [null],
      start: [null, [Validators.min(1)]],
      end: [null, [Validators.min(1)]],
      mount: [null, [Validators.min(0)]],
      tipoVehiculo: [null]
    });

    this.searchForm = this.fb.group({
      status: [''],
      tipoVehiculo: [null],
      companyCompanyId: [null]
    });
  }

  ngOnInit(): void {
    // Cargar empresa del usuario logueado y luego las opciones
    this.loadCurrentUserCompany();
  }

  private loadCurrentUserCompany(): void {
    this.companyService.getCurrentUserCompany()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of(null as Company | null))
      )
      .subscribe({
        next: (company) => {
          if (company?.companyId) {
            this.currentCompanyId.set(company.companyId);
            // Cargar servicios de negocio de la empresa
            this.loadBusinessServicesByCompany(company.companyId);
          }
          // Cargar opciones de forma paralela y optimizada
          this.loadOptions();
        }
      });
  }

  private loadBusinessServicesByCompany(companyId: number): void {
    this.companyBusinessServiceService.getByCompanyId(companyId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of([] as CompanyBusinessService[]))
      )
      .subscribe({
        next: (companyBusinessServices) => {
          const options = (Array.isArray(companyBusinessServices) ? companyBusinessServices : [])
            .map(cbs => ({
              label: cbs.businessService
                ? `${cbs.businessService.principalName} (${cbs.businessService.code})`
                : 'Sin nombre',
              value: cbs.businessService?.businessServiceId
            }))
            .filter(opt => opt.value != null);
          this.businessServiceOptions.set(options);
        }
      });
  }

  private loadOptions(): void {
    // Cargar opciones en paralelo para mejor rendimiento
    forkJoin({
      companies: this.companyService.getList().pipe(
        catchError(() => of([] as Company[]))
      ),
      tiposVehiculo: this.tipoVehiculoService.getAll().pipe(
        catchError(() => of([] as TipoVehiculo[]))
      )
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          // Cargar datos iniciales después de que las opciones estén listas
          this.loadBillingPrices();
        })
      )
      .subscribe({
        next: ({ companies, tiposVehiculo }) => {
          // Procesar companies
          this.companyOptions.set(
            (Array.isArray(companies) ? companies : []).map(company => ({
              label: company.companyName || '',
              value: company.companyId
            }))
          );

          // Procesar tiposVehiculo y crear mapa para búsqueda rápida
          const options = tiposVehiculo.map(tipo => ({
            label: tipo.description,
            value: tipo.id
          }));
          this.tipoVehiculoOptions.set(options);

          // Crear mapa para búsqueda O(1) en lugar de O(n)
          this.tipoVehiculoMap.clear();
          tiposVehiculo.forEach(tipo => {
            this.tipoVehiculoMap.set(tipo.id, tipo.description);
          });
        }
      });
  }

  loadBillingPrices(): void {
    this.loading.set(true);
    this.error.set(null);

    const filters = {
      status: this.searchForm.value.status?.trim() || undefined,
      tipoVehiculo: this.searchForm.value.tipoVehiculo || undefined,
      companyCompanyId: this.searchForm.value.companyCompanyId || undefined
    };

    this.billingPriceService.getPageable(this.page(), this.size(), filters)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (data: BillingPricePageResponse) => {
          // Formatear tipoVehiculo usando el mapa cacheado para mejor rendimiento
          const formattedData = data.content.map(item => ({
            ...item,
            tipoVehiculoDisplay: this.getTipoVehiculoDescription(
              item.tipoVehiculo as EnumResource | string | null | undefined
            )
          }));
          this.tableDataSubject.next({
            data: formattedData,
            totalRecords: data.totalElements,
            isFirst: this.page() === 0
          });
        },
        error: (err: any) => {
          this.error.set(err?.error?.message || 'Error al cargar las tarifas');
        }
      });
  }

  openCreateForm(): void {
    // Cerrar cualquier edición previa
    this.editingBillingPrice.set(null);
    // Resetear formulario de forma eficiente
    this.form.reset({
      applyDiscount: false,
      tipoVehiculo: null,
      companyCompanyId: this.currentCompanyId(),
      businessServiceBusinessServiceId: null
    });
    this.form.markAsUntouched();
    this.form.markAsPristine();
    // Abrir modal inmediatamente
    this.showForm.set(true);
  }

  onTableEdit(event: any): void {
    // Establecer datos de edición
    this.editingBillingPrice.set(event);
    // Cargar datos en el formulario
    this.form.patchValue({
      billingPriceId: event.billingPriceId,
      status: event.status || '',
      coverType: event.coverType || '',
      applyDiscount: event.applyDiscount || false,
      discountDiscountId: event.discountDiscountId || null,
      companyCompanyId: event.companyCompanyId || null,
      businessServiceBusinessServiceId: event.businessServiceBusinessServiceId || null,
      start: event.start || null,
      end: event.end || null,
      mount: event.mount || null,
      tipoVehiculo: event.tipoVehiculo || null
    });

    // Si hay companyCompanyId, cargar servicios de negocio de esa empresa
    if (event.companyCompanyId) {
      this.loadBusinessServicesByCompany(event.companyCompanyId);
    }
    // Abrir modal inmediatamente
    this.showForm.set(true);
  }

  onTableDelete(event: any): void {
    // Implementar si es necesario
  }

  onTablePagination(event: any): void {
    this.page.set(event.page || 0);
    this.size.set(event.rows || environment.rowsPerPage || 10);
    this.first.set(event.first || 0);
    this.loadBillingPrices();
  }

  submitForm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const formValue = this.form.value;
    const billingPrice: BillingPrice = {
      billingPriceId: this.editingBillingPrice()?.billingPriceId,
      status: formValue.status || null,
      coverType: formValue.coverType || null,
      applyDiscount: formValue.applyDiscount || false,
      discountDiscountId: formValue.discountDiscountId || null,
      companyCompanyId: formValue.companyCompanyId || null,
      businessServiceBusinessServiceId: formValue.businessServiceBusinessServiceId || null,
      start: formValue.start || null,
      end: formValue.end || null,
      mount: formValue.mount || null,
      tipoVehiculo: formValue.tipoVehiculo || null
    };

    const operation = this.editingBillingPrice()
      ? this.billingPriceService.update(billingPrice)
      : this.billingPriceService.create(billingPrice);

    operation
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: () => {
          // Cerrar el modal inmediatamente sin esperar
          this.showForm.set(false);
          this.editingBillingPrice.set(null);
          // Resetear formulario
          this.form.reset({
            applyDiscount: false,
            tipoVehiculo: null,
            companyCompanyId: this.currentCompanyId(),
            businessServiceBusinessServiceId: null
          });
          this.form.markAsUntouched();
          this.form.markAsPristine();
          // Recargar datos de forma asíncrona usando requestAnimationFrame para mejor rendimiento
          requestAnimationFrame(() => {
            this.loadBillingPrices();
          });
        },
        error: (err: any) => {
          this.error.set(err?.error?.message || 'Error al guardar el precio');
        }
      });
  }

  cancelForm(): void {
    // Cerrar el modal inmediatamente
    this.showForm.set(false);
    this.editingBillingPrice.set(null);
    // Resetear formulario de forma eficiente
    this.form.reset({
      applyDiscount: false,
      tipoVehiculo: null,
      companyCompanyId: this.currentCompanyId(),
      businessServiceBusinessServiceId: null
    });
    this.form.markAsUntouched();
    this.form.markAsPristine();
  }

  search(): void {
    this.page.set(0);
    this.first.set(0);
    this.onTablePagination({ page: 0, first: 0, rows: this.size(), pageCount: 0 });
  }

  clearSearch(): void {
    this.searchForm.reset();
    this.search();
  }

  getTipoVehiculoDescription(tipoVehiculo: EnumResource | string | null | undefined): string {
    if (!tipoVehiculo) return '-';
    // Si es un objeto EnumResource, usar description
    if (typeof tipoVehiculo === 'object' && tipoVehiculo.description) {
      return tipoVehiculo.description;
    }
    // Si es string (id), buscar en el mapa
    const tipoVehiculoId = typeof tipoVehiculo === 'string' ? tipoVehiculo : tipoVehiculo?.id;
    // Usar mapa cacheado para búsqueda O(1) en lugar de O(n)
    return this.tipoVehiculoMap.get(tipoVehiculoId || '') || tipoVehiculoId || '-';
  }

  onCompanyChange(event: any): void {
    const companyId = event?.value;
    if (companyId) {
      this.loadBusinessServicesByCompany(companyId);
      // Limpiar el servicio de negocio seleccionado cuando cambia la empresa
      this.form.patchValue({ businessServiceBusinessServiceId: null });
    } else {
      this.businessServiceOptions.set([]);
    }
  }
}

