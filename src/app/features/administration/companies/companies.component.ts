import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CompanyService, Company, CompanyPageResponse } from '../../../core/services/company.service';
import { CountryService, Country } from '../../../core/services/country.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SharedModule } from '../../../shared/shared-module';
import { TableColumn } from '../../../shared/components/table/table.component';
import { SelectItem } from 'primeng/api';
import { environment } from '../../../../environments/environment';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-companies',
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
  templateUrl: './companies.component.html',
  styleUrls: ['./companies.component.scss']
})
export class CompaniesComponent implements OnDestroy {
  loading = false;
  showForm = false;
  editingCompany: Company | null = null;
  error: string | null = null;
  countryOptions: SelectItem[] = [];
  
  // Paginación
  page: number = 0;
  size: number = environment.rowsPerPage || 10;
  first = 0;
  
  private subscription?: Subscription;
  private countriesSubscription?: Subscription;
  
  private tableDataSubject = new BehaviorSubject<any>({
    data: [],
    totalRecords: 0,
    isFirst: true
  });
  tableData$: Observable<any> = this.tableDataSubject.asObservable();

  // Configuración de columnas para la tabla
  cols: TableColumn[] = [
    { field: 'companyId', header: 'ID', width: '80px' },
    { field: 'companyName', header: 'Nombre de Empresa', width: '250px' },
    { field: 'numberIdentity', header: 'Número de Identidad', width: '180px' },
    { field: 'country.name', header: 'País', width: '200px' }
  ];

  form: FormGroup;
  searchForm: FormGroup;

  constructor(
    private companyService: CompanyService,
    private countryService: CountryService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      companyName: ['', [Validators.required]],
      numberIdentity: [''],
      countryId: [null]
    });

    this.searchForm = this.fb.group({
      companyName: [''],
      numberIdentity: ['']
    });
    
    // Cargar países inicialmente (las empresas se cargarán cuando la tabla dispare onLazyLoad)
    this.loadCountries();
  }

  loadCountries(): void {
    if (this.countriesSubscription) {
      this.countriesSubscription.unsubscribe();
    }

    this.countriesSubscription = this.countryService.getQueryable()
      .subscribe({
        next: (data: Country[]) => {
          this.countryOptions = (Array.isArray(data) ? data : []).map(country => ({
            label: country.name || '',
            value: country.countryId
          }));
        },
        error: (err: any) => {
          this.countryOptions = [];
        }
      });
  }

  loadCompanies(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    this.loading = true;
    this.error = null;
    
    const filters = {
      companyName: this.searchForm.value.companyName?.trim() || undefined,
      numberIdentity: this.searchForm.value.numberIdentity?.trim() || undefined
    };
    
    this.subscription = this.companyService.getPageable(this.page, this.size, filters)
      .subscribe({
        next: (data: CompanyPageResponse) => {
          this.tableDataSubject.next({
            data: data.content,
            totalRecords: data.totalElements,
            isFirst: this.page === 0
          });
          this.loading = false;
        },
        error: (err: any) => {
          this.error = err?.error?.message || err?.message || 'Error al cargar las empresas';
          this.tableDataSubject.next({
            data: [],
            totalRecords: 0,
            isFirst: true
          });
          this.loading = false;
        }
      });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.countriesSubscription) {
      this.countriesSubscription.unsubscribe();
    }
    this.tableDataSubject.complete();
  }

  search(): void {
    this.page = 0;
    this.first = 0;
    this.onTablePagination({ page: 0, first: 0, rows: this.size, pageCount: 0 });
  }

  clearSearch(): void {
    this.searchForm.reset();
    this.loadCountries();
    this.search();
  }

  openCreateForm(): void {
    this.editingCompany = null;
    this.form.reset();
    this.showForm = true;
    this.loadCountries();
  }

  openEditForm(company: Company): void {
    this.editingCompany = company;
    this.form.patchValue({
      companyName: company.companyName || '',
      numberIdentity: company.numberIdentity || '',
      countryId: company.country?.countryId || company.countryId || null
    });
    this.showForm = true;
    this.loadCountries();
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingCompany = null;
    this.form.reset();
  }

  submitForm(): void {
    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    const companyData: Company = {
      ...this.form.value,
      countryId: this.form.value.countryId || undefined
    };

    if (this.editingCompany?.companyId) {
      companyData.companyId = this.editingCompany.companyId;
    }

    const selectedCountry = this.countryOptions.find(c => c.value === this.form.value.countryId);
    const countryName = selectedCountry?.label;

    const operation = this.editingCompany
      ? this.companyService.update(companyData, countryName)
      : this.companyService.create(companyData, countryName);

    operation.subscribe({
      next: () => {
        this.loading = false;
        this.showForm = false;
        this.editingCompany = null;
        this.form.reset();
        this.loadCompanies();
      },
      error: (err: any) => {
        this.error = err?.error?.message || 'Error al guardar la empresa';
        this.loading = false;
      }
    });
  }

  onTableEdit(selected: any): void {
    if (selected) {
      this.openEditForm(selected);
    }
  }

  onTableDelete(selected: any): void {
    if (selected) {
      this.error = 'La funcionalidad de eliminar no está disponible';
    }
  }

  onTablePagination(event: any): void {
    this.page = event.page || 0;
    this.size = event.rows || environment.rowsPerPage || 10;
    this.first = event.first || 0;
    this.loadCompanies();
  }
}

