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
// CalendarModule importado en SharedModule
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
  submitted = signal(false);
  companyOptions = signal<SelectItem[]>([]);
  statusOptions = signal<SelectItem[]>([]);
  vehicleTypeOptions = signal<SelectItem[]>([]);
  basicVehicleTypeOptions = signal<SelectItem[]>([]);
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
    { field: 'easyCoverModeDisplay', header: 'Modo', width: '100px' },
    { field: 'tipoVehiculoDisplay', header: 'Tipo Vehículo', width: '150px' },
    { field: 'pricePerHour', header: 'Precio/Hora', width: '130px' },
    { field: 'dateStartDisabledDisplay', header: 'Fecha Deshabilitación', width: '150px' }
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
      status: [null, Validators.required],
      dateStartDisabled: [null],
      companyCompanyId: [null, Validators.required],
      businessServiceBusinessServiceId: [null],
      pricePerHour: [null, [Validators.required, Validators.min(0)]],
      easyCoverMode: [false, Validators.required],
      basicVehicleType: [null],
      vehicleType: [null]
    });

    // Validación condicional según easyCoverMode
    this.form.get('easyCoverMode')?.valueChanges.subscribe(easyMode => {
      if (easyMode === true) {
        this.form.get('basicVehicleType')?.setValidators([Validators.required]);
        this.form.get('vehicleType')?.clearValidators();
        this.form.get('vehicleType')?.setValue(null);
      } else {
        this.form.get('vehicleType')?.setValidators([Validators.required]);
        this.form.get('basicVehicleType')?.clearValidators();
        this.form.get('basicVehicleType')?.setValue(null);
      }
      this.form.get('basicVehicleType')?.updateValueAndValidity();
      this.form.get('vehicleType')?.updateValueAndValidity();
    });

    this.searchForm = this.fb.group({
      status: [''],
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
      status: this.enumService.getEnumByName('EBillingStatus').pipe(
        catchError(() => of([] as EnumResource[]))
      ),
      vehicleType: this.enumService.getEnumByName('ETipoVehiculo').pipe(
        catchError(() => of([] as EnumResource[]))
      ),
      basicVehicleType: this.enumService.getEnumByName('EBasicTipoVehiculo').pipe(
        catchError(() => of([] as EnumResource[]))
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
        next: ({ companies, status, vehicleType, basicVehicleType }) => {
          // Procesar companies
          this.companyOptions.set(
            (Array.isArray(companies) ? companies : []).map(company => ({
              label: company.companyName || '',
              value: company.companyId
            }))
          );

          // Procesar status
          this.statusOptions.set(
            status.map(s => ({
              label: s.description,
              value: s.id
            }))
          );

          // Crear mapa para búsqueda rápida de status
          this.statusMap.clear();
          status.forEach(s => {
            this.statusMap.set(s.id, s.description);
          });

          // Procesar vehicleType
          this.vehicleTypeOptions.set(
            vehicleType.map(vt => ({
              label: vt.description,
              value: vt.id
            }))
          );

          // Procesar basicVehicleType
          this.basicVehicleTypeOptions.set(
            basicVehicleType.map(bvt => ({
              label: bvt.description,
              value: bvt.id
            }))
          );

          // Crear mapa para búsqueda O(1) en lugar de O(n) - combinar ambos tipos
          this.tipoVehiculoMap.clear();
          vehicleType.forEach(tipo => {
            this.tipoVehiculoMap.set(tipo.id, tipo.description);
          });
          basicVehicleType.forEach(tipo => {
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

    const filters = {
      status: statusId,
      companyCompanyId: this.searchForm.value.companyCompanyId || undefined
    };

    this.billingPriceService.getPageable(this.page(), this.size(), filters)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (data: BillingPricePageResponse) => {
          // Formatear vehicleType/basicVehicleType, status y mostrar precio por hora
          const formattedData = data.content.map(item => ({
            ...item,
            statusDisplay: this.getStatusDescription(item.status),
            easyCoverModeDisplay: item.easyCoverMode ? 'Fácil' : 'Completo',
            tipoVehiculoDisplay: this.getVehicleTypeDescription(item),
            pricePerHour: item.amountByHour ? this.formatAmount(item.amountByHour) : '-',
            dateStartDisabledDisplay: item.dateStartDisabled
              ? this.formatDate(item.dateStartDisabled)
              : '-'
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
    this.submitted.set(false);
    // Resetear formulario de forma eficiente
    this.form.reset({
      easyCoverMode: false,
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

    // Extraer el ID del status si es un objeto EnumResource
    const statusValue = event.status;
    const statusId = typeof statusValue === 'object' && statusValue?.id
      ? statusValue.id
      : (typeof statusValue === 'string' ? statusValue : '');

    // Extraer IDs de vehicleType o basicVehicleType según easyCoverMode
    const easyCoverMode = event.easyCoverMode ?? false;
    let vehicleTypeId: string | null = null;
    let basicVehicleTypeId: string | null = null;

    if (easyCoverMode) {
      const basicVehicleTypeValue = event.basicVehicleType;
      basicVehicleTypeId = typeof basicVehicleTypeValue === 'object' && basicVehicleTypeValue?.id
        ? basicVehicleTypeValue.id
        : (typeof basicVehicleTypeValue === 'string' ? basicVehicleTypeValue : null);
    } else {
      const vehicleTypeValue = event.vehicleType;
      vehicleTypeId = typeof vehicleTypeValue === 'object' && vehicleTypeValue?.id
        ? vehicleTypeValue.id
        : (typeof vehicleTypeValue === 'string' ? vehicleTypeValue : null);
    }

    this.form.patchValue({
      billingPriceId: event.billingPriceId,
      status: statusId,
      companyCompanyId: event.companyCompanyId || null,
      businessServiceBusinessServiceId: event.businessServiceBusinessServiceId || null,
      pricePerHour: event.amountByHour || null,
      easyCoverMode: easyCoverMode,
      vehicleType: vehicleTypeId,
      basicVehicleType: basicVehicleTypeId,
      dateStartDisabled: event.dateStartDisabled ? new Date(event.dateStartDisabled) : null
    });

    // Si hay companyCompanyId, cargar servicios de negocio de esa empresa
    if (event.companyCompanyId) {
      this.loadBusinessServicesByCompany(event.companyCompanyId);
    }
    this.submitted.set(false);
    // Abrir modal inmediatamente
    this.showForm.set(true);
  }

  onTableDelete(selected: any): void {
    if (selected && selected.billingPriceId) {
      const itemName = selected.amountByHour
        ? `la tarifa de $${this.formatAmount(selected.amountByHour)} por hora`
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
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const formValue = this.form.value;

    // Preparar status como objeto EnumResource con id
    const statusValue = formValue.status;
    const status: EnumResource | null | undefined = statusValue ? {
      id: typeof statusValue === 'string' ? statusValue : (statusValue.id || statusValue),
      description: typeof statusValue === 'object' ? (statusValue.description || '') : '',
      descriptionExtended: typeof statusValue === 'object' ? (statusValue.descriptionExtended || '') : ''
    } : (statusValue === null ? null : undefined);

    // Preparar vehicleType o basicVehicleType según easyCoverMode
    const easyCoverMode = formValue.easyCoverMode ?? false;
    let vehicleType: EnumResource | null | undefined = null;
    let basicVehicleType: EnumResource | null | undefined = null;

    if (easyCoverMode) {
      const basicVehicleTypeValue = formValue.basicVehicleType;
      basicVehicleType = basicVehicleTypeValue ? {
        id: typeof basicVehicleTypeValue === 'string' ? basicVehicleTypeValue : (basicVehicleTypeValue.id || basicVehicleTypeValue),
        description: typeof basicVehicleTypeValue === 'object' ? (basicVehicleTypeValue.description || '') : '',
        descriptionExtended: typeof basicVehicleTypeValue === 'object' ? (basicVehicleTypeValue.descriptionExtended || '') : ''
      } : null;
    } else {
      const vehicleTypeValue = formValue.vehicleType;
      vehicleType = vehicleTypeValue ? {
        id: typeof vehicleTypeValue === 'string' ? vehicleTypeValue : (vehicleTypeValue.id || vehicleTypeValue),
        description: typeof vehicleTypeValue === 'object' ? (vehicleTypeValue.description || '') : '',
        descriptionExtended: typeof vehicleTypeValue === 'object' ? (vehicleTypeValue.descriptionExtended || '') : ''
      } : null;
    }

    const billingPrice: BillingPrice = {
      billingPriceId: this.editingBillingPrice()?.billingPriceId,
      status: status ?? null,
      dateStartDisabled: formValue.dateStartDisabled
        ? this.formatDateForBackend(formValue.dateStartDisabled)
        : undefined,
      companyCompanyId: formValue.companyCompanyId || null,
      businessServiceBusinessServiceId: formValue.businessServiceBusinessServiceId || null,
      amountByHour: formValue.pricePerHour || null,
      easyCoverMode: easyCoverMode,
      basicVehicleType: basicVehicleType,
      vehicleType: vehicleType
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
          this.submitted.set(false);
          // Cerrar el modal inmediatamente sin esperar
          this.showForm.set(false);
          this.editingBillingPrice.set(null);
          // Resetear formulario
          this.form.reset({
            easyCoverMode: false,
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
    this.submitted.set(false);
    // Resetear formulario de forma eficiente
    this.form.reset({
      easyCoverMode: false,
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

  getVehicleTypeDescription(item: any): string {
    if (item.easyCoverMode && item.basicVehicleType) {
      const basicType = item.basicVehicleType;
      if (typeof basicType === 'object' && basicType.description) {
        return basicType.description;
      }
      const id = typeof basicType === 'string' ? basicType : basicType?.id;
      return this.tipoVehiculoMap.get(id || '') || id || '-';
    } else if (!item.easyCoverMode && item.vehicleType) {
      const vehicleType = item.vehicleType;
      if (typeof vehicleType === 'object' && vehicleType.description) {
        return vehicleType.description;
      }
      const id = typeof vehicleType === 'string' ? vehicleType : vehicleType?.id;
      return this.tipoVehiculoMap.get(id || '') || id || '-';
    }
    return '-';
  }

  /**
   * Formatea un monto como string con separador de miles y 2 decimales
   */
  formatAmount(amount: number | null | undefined): string {
    if (!amount && amount !== 0) {
      return '-';
    }
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Formatea una fecha para enviar al backend (YYYY-MM-DD)
   */
  formatDateForBackend(date: Date | string): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Formatea una fecha para mostrar en la tabla (dd/MM/yyyy)
   */
  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
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

