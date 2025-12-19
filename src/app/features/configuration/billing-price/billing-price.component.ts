import { Component, signal, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { BillingPriceService, BillingPrice, BillingPricePageResponse } from '../../../core/services/billing-price.service';
import { CompanyService, Company } from '../../../core/services/company.service';
import { EnumService, EnumResource } from '../../../core/services/enum.service';
import { CompanyBusinessServiceService, CompanyBusinessService } from '../../../core/services/company-business-service.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
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
import { catchError, finalize, shareReplay, filter, switchMap } from 'rxjs/operators';

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
  statusOptions = signal<SelectItem[]>([]);
  tipoVehiculoOptions = signal<SelectItem[]>([]);
  businessServiceOptions = signal<SelectItem[]>([]);
  currentCompanyId = signal<number | null>(null);

  // Cache para mapeo rápido de tipoVehiculo y status
  private tipoVehiculoMap = new Map<string, string>();
  private statusMap = new Map<string, string>();

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
    { field: 'statusDisplay', header: 'Estado', width: '120px' },
    { field: 'coverType', header: 'Tipo de Cobertura', width: '150px' },
    { field: 'tipoVehiculoDisplay', header: 'Tipo de Vehículo', width: '150px' },
    { field: 'pricePerHour', header: 'Precio por Hora', width: '130px' },
    { field: 'applyDiscount', header: 'Aplica Descuento', width: '150px' }
  ];

  form: FormGroup;
  searchForm: FormGroup;

  constructor(
    private billingPriceService: BillingPriceService,
    private companyService: CompanyService,
    private enumService: EnumService,
    private companyBusinessServiceService: CompanyBusinessServiceService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      status: [''],
      coverType: [''],
      applyDiscount: [false],
      discountDiscountId: [null],
      companyCompanyId: [null],
      businessServiceBusinessServiceId: [null],
      hours: [1], // Valor por defecto: 1 hora (no visible en el formulario)
      pricePerHour: [null, [Validators.required, Validators.min(0)]],
      mount: [null], // Se calcula automáticamente: pricePerHour * hours (donde hours = 1)
      tipoVehiculo: [null]
    });

    // Calcular mount automáticamente cuando cambia pricePerHour
    // Usamos 1 hora como valor por defecto
    this.form.get('pricePerHour')?.valueChanges.subscribe(() => this.calculateMount());

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
      enums: this.enumService.getBillingPriceEnums().pipe(
        catchError(() => of({ status: [], tipoVehiculo: [] } as { status: EnumResource[]; tipoVehiculo: EnumResource[] }))
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
        next: ({ companies, enums }) => {
          // Procesar companies
          this.companyOptions.set(
            (Array.isArray(companies) ? companies : []).map(company => ({
              label: company.companyName || '',
              value: company.companyId
            }))
          );

          // Procesar status desde enums
          const statusOptions = (enums.status || []).map(status => ({
            label: status.description,
            value: status.id
          }));
          this.statusOptions.set(statusOptions);

          // Crear mapa para búsqueda rápida de status
          this.statusMap.clear();
          (enums.status || []).forEach(status => {
            this.statusMap.set(status.id, status.description);
          });

          // Procesar tiposVehiculo desde enums
          const tipoVehiculoOptions = (enums.tipoVehiculo || []).map(tipo => ({
            label: tipo.description,
            value: tipo.id
          }));
          this.tipoVehiculoOptions.set(tipoVehiculoOptions);

          // Crear mapa para búsqueda O(1) en lugar de O(n)
          this.tipoVehiculoMap.clear();
          (enums.tipoVehiculo || []).forEach(tipo => {
            this.tipoVehiculoMap.set(tipo.id, tipo.description);
          });
        }
      });
  }

  loadBillingPrices(): void {
    this.loading.set(true);
    this.error.set(null);

    // Extraer el ID del status si es un objeto EnumResource
    const statusValue = this.searchForm.value.status;
    const statusId = typeof statusValue === 'object' && statusValue?.id
      ? statusValue.id
      : (typeof statusValue === 'string' ? statusValue : undefined);

    // Extraer el ID del tipoVehiculo si es un objeto EnumResource
    const tipoVehiculoValue = this.searchForm.value.tipoVehiculo;
    const tipoVehiculoId = typeof tipoVehiculoValue === 'object' && tipoVehiculoValue?.id
      ? tipoVehiculoValue.id
      : (typeof tipoVehiculoValue === 'string' ? tipoVehiculoValue : undefined);

    const filters = {
      status: statusId,
      tipoVehiculo: tipoVehiculoId,
      companyCompanyId: this.searchForm.value.companyCompanyId || undefined
    };

    this.billingPriceService.getPageable(this.page(), this.size(), filters)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (data: BillingPricePageResponse) => {
          // Formatear tipoVehiculo, status y calcular precio por hora
          const formattedData = data.content.map(item => ({
            ...item,
            statusDisplay: this.getStatusDescription(item.status),
            tipoVehiculoDisplay: this.getTipoVehiculoDescription(item.tipoVehiculo),
            pricePerHour: this.calculatePricePerHour(item.mount, item.hours)
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
    // Usar 1 hora por defecto (no visible en el formulario)
    this.form.reset({
      applyDiscount: false,
      tipoVehiculo: null,
      companyCompanyId: this.currentCompanyId(),
      businessServiceBusinessServiceId: null,
      hours: 1, // Valor por defecto: 1 hora
      pricePerHour: null,
      mount: null
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
    // Calcular precio por hora desde mount y hours
    const pricePerHour = event.hours && event.mount && event.hours > 0
      ? event.mount / event.hours
      : null;

    // Extraer el ID del status si es un objeto EnumResource
    const statusValue = event.status;
    const statusId = typeof statusValue === 'object' && statusValue?.id
      ? statusValue.id
      : (typeof statusValue === 'string' ? statusValue : '');

    // Extraer el ID del tipoVehiculo si es un objeto EnumResource
    const tipoVehiculoValue = event.tipoVehiculo;
    const tipoVehiculoId = typeof tipoVehiculoValue === 'object' && tipoVehiculoValue?.id
      ? tipoVehiculoValue.id
      : (typeof tipoVehiculoValue === 'string' ? tipoVehiculoValue : null);

    this.form.patchValue({
      billingPriceId: event.billingPriceId,
      status: statusId,
      coverType: event.coverType || '',
      applyDiscount: event.applyDiscount || false,
      discountDiscountId: event.discountDiscountId || null,
      companyCompanyId: event.companyCompanyId || null,
      businessServiceBusinessServiceId: event.businessServiceBusinessServiceId || null,
      hours: event.hours || null,
      pricePerHour: pricePerHour,
      mount: event.mount || null, // Mantener mount para enviar al backend
      tipoVehiculo: tipoVehiculoId
    });

    // Si hay companyCompanyId, cargar servicios de negocio de esa empresa
    if (event.companyCompanyId) {
      this.loadBusinessServicesByCompany(event.companyCompanyId);
    }
    // Abrir modal inmediatamente
    this.showForm.set(true);
  }

  onTableDelete(selected: any): void {
    if (selected && selected.billingPriceId) {
      const itemName = selected.hours
        ? `la tarifa de ${selected.hours} hora${selected.hours > 1 ? 's' : ''}`
        : 'esta tarifa';

      this.confirmationService.confirmDelete(itemName)
        .pipe(
          filter((confirmed: boolean) => confirmed),
          switchMap(() => {
            this.loading.set(true);
            return this.billingPriceService.delete(selected.billingPriceId);
          }),
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.loading.set(false))
        )
        .subscribe({
          next: () => {
            this.loadBillingPrices();
          },
          error: (err: any) => {
            this.error.set(err?.error?.message || 'Error al eliminar la tarifa');
          }
        });
    }
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

    // Si está editando, mantener las horas originales; si es nuevo, usar 1 hora
    const hours = this.editingBillingPrice()?.hours || formValue.hours || 1;
    let mount = formValue.mount;

    // Calcular mount desde pricePerHour y hours
    if (formValue.pricePerHour && hours) {
      mount = Math.round(formValue.pricePerHour * hours);
    }

    // Preparar status y tipoVehiculo como objetos EnumResource con id
    // El backend espera EnumResource con al menos el campo id
    const statusValue = formValue.status;
    const status: EnumResource | null | undefined = statusValue ? {
      id: typeof statusValue === 'string' ? statusValue : (statusValue.id || statusValue),
      description: typeof statusValue === 'object' ? (statusValue.description || '') : '',
      descriptionExtended: typeof statusValue === 'object' ? (statusValue.descriptionExtended || '') : ''
    } : (statusValue === null ? null : undefined);

    const tipoVehiculoValue = formValue.tipoVehiculo;
    const tipoVehiculo: EnumResource | null | undefined = tipoVehiculoValue ? {
      id: typeof tipoVehiculoValue === 'string' ? tipoVehiculoValue : (tipoVehiculoValue.id || tipoVehiculoValue),
      description: typeof tipoVehiculoValue === 'object' ? (tipoVehiculoValue.description || '') : '',
      descriptionExtended: typeof tipoVehiculoValue === 'object' ? (tipoVehiculoValue.descriptionExtended || '') : ''
    } : (tipoVehiculoValue === null ? null : undefined);

    const billingPrice: BillingPrice = {
      billingPriceId: this.editingBillingPrice()?.billingPriceId,
      status: status ?? null,
      coverType: formValue.coverType || null,
      applyDiscount: formValue.applyDiscount || false,
      discountDiscountId: formValue.discountDiscountId || null,
      companyCompanyId: formValue.companyCompanyId || null,
      businessServiceBusinessServiceId: formValue.businessServiceBusinessServiceId || null,
      hours: hours,
      mount: mount || null,
      tipoVehiculo: tipoVehiculo ?? null
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
            businessServiceBusinessServiceId: null,
            hours: 1, // Valor por defecto: 1 hora
            pricePerHour: null,
            mount: null
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
      businessServiceBusinessServiceId: null,
      hours: 1, // Valor por defecto: 1 hora
      pricePerHour: null,
      mount: null
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

  getStatusDescription(status: EnumResource | string | null | undefined): string {
    if (!status) return '-';
    // Si es un objeto EnumResource, usar description
    if (typeof status === 'object' && status.description) {
      return status.description;
    }
    // Si es string (id), buscar en el mapa
    const statusId = typeof status === 'string' ? status : status?.id;
    return this.statusMap.get(statusId || '') || statusId || '-';
  }

  getTipoVehiculoDescription(tipoVehiculo: EnumResource | string | null | undefined): string {
    if (!tipoVehiculo) return '-';
    // Si es un objeto EnumResource, usar description
    if (typeof tipoVehiculo === 'object' && tipoVehiculo.description) {
      return tipoVehiculo.description;
    }
    // Si es string (id), buscar en el mapa
    const tipoVehiculoId = typeof tipoVehiculo === 'string' ? tipoVehiculo : tipoVehiculo?.id;
    return this.tipoVehiculoMap.get(tipoVehiculoId || '') || tipoVehiculoId || '-';
  }

  /**
   * Calcula el precio por hora basado en el monto total y las horas
   * @param mount Monto total (puede ser null o undefined)
   * @param hours Número de horas (puede ser null o undefined)
   * @returns Precio por hora formateado como string, o '-' si no se puede calcular
   */
  calculatePricePerHour(mount: number | null | undefined, hours: number | null | undefined): string {
    if (!mount || !hours || hours <= 0) {
      return '-';
    }
    const pricePerHour = mount / hours;
    // Formatear con separador de miles y 2 decimales
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(pricePerHour);
  }

  /**
   * Calcula el monto total basado en precio por hora
   * Usa 1 hora como valor por defecto (ya que las horas no se muestran en el formulario)
   * Se ejecuta automáticamente cuando cambia pricePerHour
   */
  calculateMount(): void {
    const pricePerHour = this.form.get('pricePerHour')?.value;
    const hours = 1; // Valor fijo: 1 hora (ya que no se muestra en el formulario)

    if (pricePerHour && pricePerHour >= 0) {
      const mount = Math.round(pricePerHour * hours);
      this.form.patchValue({ mount, hours }, { emitEvent: false });
    } else {
      this.form.patchValue({ mount: null, hours: 1 }, { emitEvent: false });
    }
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

