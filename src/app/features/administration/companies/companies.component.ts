import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CompanyService, Company } from '../../../core/services/company.service';
import { CountryService, Country } from '../../../core/services/country.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SharedModule } from '../../../shared/shared-module';
import { TableColumn } from '../../../shared/components/table/table.component';
import { SelectItem } from 'primeng/api';
import { Subscription, timeout } from 'rxjs';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    MessageModule,
    SharedModule
  ],
  templateUrl: './companies.component.html',
  styleUrls: ['./companies.component.scss']
})
export class CompaniesComponent implements OnInit, OnDestroy {
  companies: Company[] = [];
  countries: Country[] = [];
  countryOptions: SelectItem[] = [];
  loading = false;
  showForm = false;
  editingCompany: Company | null = null;
  error: string | null = null;
  searchCompanyName = '';
  searchNumberIdentity = '';
  private subscription?: Subscription;
  private countriesSubscription?: Subscription;
  private countryFilterTimeout?: any;
  private lastCountryFilter: string = '';

  // Configuración de columnas para la tabla
  cols: TableColumn[] = [
    { field: 'companyId', header: 'ID', width: '80px' },
    { field: 'companyName', header: 'Nombre de Empresa', width: '250px' },
    { field: 'numberIdentity', header: 'Número de Identidad', width: '180px' },
    { field: 'country.name', header: 'País', width: '200px' }
  ];

  tableData: any = {
    data: [],
    totalRecords: 0,
    isFirst: true
  };

  form: FormGroup;

  constructor(
    private companyService: CompanyService,
    private countryService: CountryService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      companyName: ['', [Validators.required]],
      numberIdentity: [''],
      countryId: [null]
    });
  }

  ngOnInit(): void {
    // Cargar todos los países inicialmente (sin filtro)
    this.loadCountries();
    this.loadCompanies();
  }

  loadCountries(filter?: string): void {
    if (this.countriesSubscription) {
      this.countriesSubscription.unsubscribe();
    }

    this.countriesSubscription = this.countryService.getCountriesQueryable(undefined, undefined, filter)
      .pipe(
        timeout(30000)
      )
      .subscribe({
        next: (data) => {
          this.countries = Array.isArray(data) ? data : [];
          // Convertir países a SelectItem[] para el dropdown
          this.countryOptions = this.countries.map(country => ({
            label: country.name || '',
            value: country.countryId
          }));
          // Actualizar el último filtro aplicado
          this.lastCountryFilter = filter || '';
        },
        error: (err) => {
          console.error('Error al cargar países:', err);
          this.countries = [];
          this.countryOptions = [];
          this.lastCountryFilter = '';
        }
      });
  }

  onCountryLazyLoad(event: any): void {
    const filter = event.filter || '';
    
    // Solo procesar si el filtro cambió (no es solo scroll)
    if (filter === this.lastCountryFilter) {
      return; // Es solo scroll, no hacer nada porque ya tenemos todos los datos
    }
    
    this.lastCountryFilter = filter;
    
    // Debounce para evitar demasiadas llamadas mientras el usuario escribe
    if (this.countryFilterTimeout) {
      clearTimeout(this.countryFilterTimeout);
    }
    
    this.countryFilterTimeout = setTimeout(() => {
      // Usar el servicio queryable que retorna lista completa filtrada por nombre
      this.loadCountries(filter);
    }, 300); // Esperar 300ms después de que el usuario deje de escribir
  }

  loadCompanies(): void {
    // Cancelar suscripción anterior si existe
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    this.loading = true;
    this.error = null;
    const companyName = this.searchCompanyName.trim() || undefined;
    const numberIdentity = this.searchNumberIdentity.trim() || undefined;
    
    this.subscription = this.companyService.getCompanies(undefined, companyName, numberIdentity)
      .pipe(
        timeout(30000) // Timeout de 30 segundos
      )
      .subscribe({
        next: (data) => {
          this.companies = Array.isArray(data) ? data : [];
          this.tableData = {
            data: this.companies,
            totalRecords: this.companies.length,
            isFirst: true
          };
          // Ocultar spinner inmediatamente y forzar detección de cambios
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = err?.error?.message || err?.message || 'Error al cargar las empresas';
          this.companies = [];
          // Ocultar spinner inmediatamente en caso de error y forzar detección de cambios
          this.loading = false;
          this.cdr.detectChanges();
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
    if (this.countryFilterTimeout) {
      clearTimeout(this.countryFilterTimeout);
    }
  }

  search(): void {
    this.loadCompanies();
  }

  openCreateForm(): void {
    this.editingCompany = null;
    this.form.reset();
    this.showForm = true;
  }

  openEditForm(company: Company): void {
    this.editingCompany = company;
    this.form.patchValue({
      companyName: company.companyName || '',
      numberIdentity: company.numberIdentity || '',
      countryId: company.country?.countryId || company.countryId || null
    });
    this.showForm = true;
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

    // Buscar el nombre del país seleccionado
    const selectedCountry = this.countries.find(c => c.countryId === this.form.value.countryId);
    const countryName = selectedCountry?.name;

    const operation = this.editingCompany
      ? this.companyService.updateCompany(companyData, countryName)
      : this.companyService.createCompany(companyData, countryName);

    operation.subscribe({
      next: () => {
        this.loading = false;
        this.showForm = false;
        this.editingCompany = null;
        this.form.reset();
        this.loadCompanies();
      },
      error: (err) => {
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
    if (selected && confirm(`¿Está seguro de eliminar la empresa "${selected.companyName}"?`)) {
      // Nota: El backend no tiene endpoint DELETE, pero se puede implementar aquí si se agrega
      this.error = 'La funcionalidad de eliminar no está disponible en el backend';
    }
  }

  onTablePagination(event: any): void {
    // Para empresas no hay paginación server-side, pero se puede implementar aquí
  }

  deleteCompany(company: Company): void {
    if (!confirm(`¿Está seguro de eliminar la empresa "${company.companyName}"?`)) {
      return;
    }
    // Nota: El backend no tiene endpoint DELETE, pero se puede implementar aquí si se agrega
    this.error = 'La funcionalidad de eliminar no está disponible en el backend';
  }
}

