import { Component, signal, OnInit, DestroyRef, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { BillingPriceService, BillingPrice, BillingPricePageResponse } from '../../../core/services/billing-price.service';
import { CompanyService, Company } from '../../../core/services/company.service';
import { CompanyBusinessServiceService, CompanyBusinessService } from '../../../core/services/company-business-service.service';
import { EnumService, EnumResource } from '../../../core/services/enum.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ButtonModule } from 'primeng/button';
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
import { catchError, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-billing-price',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
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

  // Signals
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
    { field: 'vehicleTypeDisplay', header: 'Tipo Vehículo', width: '150px' },
    { field: 'basicVehicleTypeDisplay', header: 'Tipo Básico', width: '150px' },
    { field: 'amountByHour', header: 'Precio/Hora', width: '120px' },
    { field: 'dateStartDisabledDisplay', header: 'Fecha Deshabilitación', width: '150px' }
  ];

  form: FormGroup;
  searchForm: FormGroup;

  // Computed para mostrar/ocultar campos según easyCoverMode
  showVehicleType = computed(() => {
    const easyMode = this.form.get('easyCoverMode')?.value;
    return easyMode === false;
  });

  showBasicVehicleType = computed(() => {
    const easyMode = this.form.get('easyCoverMode')?.value;
    return easyMode === true;
  });

  constructor(
    private billingPriceService: BillingPriceService,
    private companyService: CompanyService,
    private notificationService: NotificationService,
    private companyBusinessServiceService: CompanyBusinessServiceService,
    private enumService: EnumService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      status: [null, Validators.required],
      dateStartDisabled: [null],
      companyCompanyId: [null, Validators.required],
      businessServiceBusinessServiceId: [null],
      amountByHour: [null, [Validators.required, Validators.min(0)]],
      easyCoverMode: [false, Validators.required],
      basicVehicleType: [null],
      vehicleType: [null]
    });

    this.searchForm = this.fb.group({
      status: [''],
      companyCompanyId: [null]
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
  }

  ngOnInit(): void {
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
            this.loadBusinessServicesByCompany(company.companyId);
          }
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
          this.loadBillingPrices();
        })
      )
      .subscribe({
        next: ({ companies, status, vehicleType, basicVehicleType }) => {
          this.companyOptions.set(
            (Array.isArray(companies) ? companies : []).map(company => ({
              label: company.companyName || '',
              value: company.companyId
            }))
          );

          this.statusOptions.set(
            status.map(s => ({
              label: s.description,
              value: s.id
            }))
          );

          this.vehicleTypeOptions.set(
            vehicleType.map(vt => ({
              label: vt.description,
              value: vt.id
            }))
          );

          this.basicVehicleTypeOptions.set(
            basicVehicleType.map(bvt => ({
              label: bvt.description,
              value: bvt.id
            }))
          );
        }
      });
  }

  loadBillingPrices(): void {
    this.loading.set(true);
    this.error.set(null);

    const filters = {
      status: this.searchForm.value.status?.trim() || undefined,
      companyCompanyId: this.searchForm.value.companyCompanyId || undefined
    };

    this.billingPriceService.getPageable(this.page(), this.size(), filters)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (data: BillingPricePageResponse) => {
          const formattedData = data.content.map(item => ({
            ...item,
            statusDisplay: this.getEnumDescription(item.status),
            easyCoverModeDisplay: item.easyCoverMode ? 'Fácil' : 'Completo',
            vehicleTypeDisplay: this.getEnumDescription(item.vehicleType),
            basicVehicleTypeDisplay: this.getEnumDescription(item.basicVehicleType),
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
    this.editingBillingPrice.set(null);
    this.submitted.set(false);
    this.form.reset({
      easyCoverMode: false,
      companyCompanyId: this.currentCompanyId(),
      businessServiceBusinessServiceId: null
    });
    this.form.markAsUntouched();
    this.form.markAsPristine();
    this.showForm.set(true);
  }

  onTableEdit(event: any): void {
    this.editingBillingPrice.set(event);

    const formData: any = {
      billingPriceId: event.billingPriceId,
      status: this.extractEnumId(event.status),
      dateStartDisabled: event.dateStartDisabled ? new Date(event.dateStartDisabled) : null,
      companyCompanyId: event.companyCompanyId || null,
      businessServiceBusinessServiceId: event.businessServiceBusinessServiceId || null,
      amountByHour: event.amountByHour || null,
      easyCoverMode: event.easyCoverMode ?? false,
      basicVehicleType: this.extractEnumId(event.basicVehicleType),
      vehicleType: this.extractEnumId(event.vehicleType)
    };

    this.form.patchValue(formData);
    this.submitted.set(false);

    if (event.companyCompanyId) {
      this.loadBusinessServicesByCompany(event.companyCompanyId);
    }
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
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const formValue = this.form.value;
    const billingPrice: BillingPrice = {
      billingPriceId: this.editingBillingPrice()?.billingPriceId,
      status: formValue.status ? { id: formValue.status, description: '' } : null,
      dateStartDisabled: formValue.dateStartDisabled
        ? this.formatDateForBackend(formValue.dateStartDisabled)
        : undefined,
      companyCompanyId: formValue.companyCompanyId || null,
      businessServiceBusinessServiceId: formValue.businessServiceBusinessServiceId || null,
      amountByHour: formValue.amountByHour || null,
      easyCoverMode: formValue.easyCoverMode ?? false,
      basicVehicleType: formValue.basicVehicleType
        ? { id: formValue.basicVehicleType, description: '' }
        : null,
      vehicleType: formValue.vehicleType
        ? { id: formValue.vehicleType, description: '' }
        : null
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
          this.showForm.set(false);
          this.editingBillingPrice.set(null);
          this.form.reset({
            easyCoverMode: false,
            companyCompanyId: this.currentCompanyId(),
            businessServiceBusinessServiceId: null
          });
          this.form.markAsUntouched();
          this.form.markAsPristine();
          requestAnimationFrame(() => {
            this.loadBillingPrices();
          });
        },
        error: (err: any) => {
          // El interceptor ya maneja los errores 412 automáticamente
          // Solo establecer el error local si no es 412 para mantener compatibilidad
          if (err?.status !== 412) {
            this.error.set(err?.error?.message || 'Error al guardar la tarifa');
            this.notificationService.error(err?.error?.message || 'Error al guardar la tarifa');
          } else {
            // Para errores 412, solo limpiar el error local ya que la notificación ya se mostró
            this.error.set(null);
          }
        }
      });
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingBillingPrice.set(null);
    this.submitted.set(false);
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

  onCompanyChange(event: any): void {
    const companyId = event?.value;
    if (companyId) {
      this.loadBusinessServicesByCompany(companyId);
      this.form.patchValue({ businessServiceBusinessServiceId: null });
    } else {
      this.businessServiceOptions.set([]);
    }
  }

  private getEnumDescription(enumValue: EnumResource | string | null | undefined): string {
    if (!enumValue) return '-';
    if (typeof enumValue === 'object' && enumValue.description) {
      return enumValue.description;
    }
    const id = typeof enumValue === 'string' ? enumValue : enumValue?.id;
    // Buscar en las opciones cargadas
    const statusOpt = this.statusOptions().find(opt => opt.value === id);
    if (statusOpt?.label) return statusOpt.label;
    const vehicleOpt = this.vehicleTypeOptions().find(opt => opt.value === id);
    if (vehicleOpt?.label) return vehicleOpt.label;
    const basicOpt = this.basicVehicleTypeOptions().find(opt => opt.value === id);
    if (basicOpt?.label) return basicOpt.label;
    return id || '-';
  }

  private extractEnumId(enumValue: EnumResource | string | null | undefined): string | null {
    if (!enumValue) return null;
    if (typeof enumValue === 'object' && enumValue.id) {
      return enumValue.id;
    }
    return typeof enumValue === 'string' ? enumValue : null;
  }

  private formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  private formatDateForBackend(date: Date | string): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
