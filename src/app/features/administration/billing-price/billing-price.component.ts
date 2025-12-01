import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { BillingPriceService, BillingPrice, BillingPricePageResponse } from '../../../core/services/billing-price.service';
import { CompanyService, Company } from '../../../core/services/company.service';
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
import { BehaviorSubject, Observable, Subscription } from 'rxjs';

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
export class BillingPriceComponent implements OnInit, OnDestroy {
  loading = false;
  showForm = false;
  editingBillingPrice: BillingPrice | null = null;
  error: string | null = null;
  companyOptions: SelectItem[] = [];
  
  // Paginación
  page: number = 0;
  size: number = environment.rowsPerPage || 10;
  first = 0;
  
  private subscription?: Subscription;
  private companiesSubscription?: Subscription;
  
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
    { field: 'start', header: 'Inicio (horas)', width: '120px' },
    { field: 'end', header: 'Fin (horas)', width: '120px' },
    { field: 'mount', header: 'Monto', width: '120px' },
    { field: 'applyDiscount', header: 'Aplica Descuento', width: '150px' }
  ];

  form: FormGroup;
  searchForm: FormGroup;

  constructor(
    private billingPriceService: BillingPriceService,
    private companyService: CompanyService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      status: [''],
      coverType: [''],
      applyDiscount: [false],
      discountDiscountId: [null],
      companyCompanyId: [null],
      start: [null, [Validators.min(1), Validators.max(5)]],
      end: [null, [Validators.min(1), Validators.max(5)]],
      mount: [null, [Validators.min(0)]]
    });

    this.searchForm = this.fb.group({
      status: [''],
      coverType: [''],
      companyCompanyId: [null]
    });
    
    this.loadCompanies();
  }

  ngOnInit(): void {
    // Cargar datos iniciales cuando se inicializa el componente
    this.loadBillingPrices();
  }

  loadCompanies(): void {
    if (this.companiesSubscription) {
      this.companiesSubscription.unsubscribe();
    }

    this.companiesSubscription = this.companyService.getList()
      .subscribe({
        next: (data: Company[]) => {
          this.companyOptions = (Array.isArray(data) ? data : []).map(company => ({
            label: company.companyName || '',
            value: company.companyId
          }));
        },
        error: (err: any) => {
          this.companyOptions = [];
        }
      });
  }

  loadBillingPrices(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    this.loading = true;
    this.error = null;
    
    const filters = {
      status: this.searchForm.value.status?.trim() || undefined,
      coverType: this.searchForm.value.coverType?.trim() || undefined,
      companyCompanyId: this.searchForm.value.companyCompanyId || undefined
    };
    
    this.subscription = this.billingPriceService.getPageable(this.page, this.size, filters)
      .subscribe({
        next: (data: BillingPricePageResponse) => {
          this.tableDataSubject.next({
            data: data.content,
            totalRecords: data.totalElements,
            isFirst: this.page === 0
          });
          this.loading = false;
        },
        error: (err: any) => {
          this.error = err?.error?.message || 'Error al cargar los precios';
          this.loading = false;
        }
      });
  }

  openCreateForm(): void {
    this.editingBillingPrice = null;
    this.form.reset({
      applyDiscount: false
    });
    this.showForm = true;
  }

  onTableEdit(event: any): void {
    this.editingBillingPrice = event;
    this.form.patchValue({
      billingPriceId: event.billingPriceId,
      status: event.status || '',
      coverType: event.coverType || '',
      applyDiscount: event.applyDiscount || false,
      discountDiscountId: event.discountDiscountId || null,
      companyCompanyId: event.companyCompanyId || null,
      start: event.start || null,
      end: event.end || null,
      mount: event.mount || null
    });
    this.showForm = true;
  }

  onTableDelete(event: any): void {
    // Implementar si es necesario
  }

  onTablePagination(event: any): void {
    this.page = event.page || 0;
    this.size = event.size || this.size;
    this.first = this.page * this.size;
    this.loadBillingPrices();
  }

  submitForm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;

    const formValue = this.form.value;
    const billingPrice: BillingPrice = {
      billingPriceId: this.editingBillingPrice?.billingPriceId,
      status: formValue.status || null,
      coverType: formValue.coverType || null,
      applyDiscount: formValue.applyDiscount || false,
      discountDiscountId: formValue.discountDiscountId || null,
      companyCompanyId: formValue.companyCompanyId || null,
      start: formValue.start || null,
      end: formValue.end || null,
      mount: formValue.mount || null
    };

    const operation = this.editingBillingPrice
      ? this.billingPriceService.update(billingPrice)
      : this.billingPriceService.create(billingPrice);

    operation.subscribe({
      next: () => {
        this.loading = false;
        this.showForm = false;
        this.loadBillingPrices();
      },
      error: (err: any) => {
        this.error = err?.error?.message || 'Error al guardar el precio';
        this.loading = false;
      }
    });
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingBillingPrice = null;
    // Resetear el formulario de forma más eficiente
    this.form.patchValue({
      status: '',
      coverType: '',
      applyDiscount: false,
      discountDiscountId: null,
      companyCompanyId: null,
      start: null,
      end: null,
      mount: null
    });
    this.form.markAsUntouched();
    this.form.markAsPristine();
  }

  search(): void {
    this.page = 0;
    this.first = 0;
    this.loadBillingPrices();
  }

  clearSearch(): void {
    this.searchForm.reset();
    this.page = 0;
    this.first = 0;
    this.loadBillingPrices();
  }


  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.companiesSubscription) {
      this.companiesSubscription.unsubscribe();
    }
  }
}

