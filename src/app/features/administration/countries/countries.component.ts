import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CountryService, Country, CountryPageResponse } from '../../../core/services/country.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SharedModule } from '../../../shared/shared-module';
import { TableColumn } from '../../../shared/components/table/table.component';
import { environment } from '../../../../environments/environment';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-countries',
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
  templateUrl: './countries.component.html',
  styleUrls: ['./countries.component.scss']
})
export class CountriesComponent implements OnDestroy {
  loading = false;
  showForm = false;
  editingCountry: Country | null = null;
  error: string | null = null;
  
  // Paginación
  page: number = 0;
  size: number = environment.rowsPerPage || 10;
  first = 0;
  
  private subscription?: Subscription;

  // Configuración de columnas para la tabla
  cols: TableColumn[] = [
    { field: 'countryId', header: 'ID', width: '80px' },
    { field: 'name', header: 'Nombre', width: '200px' },
    { field: 'description', header: 'Descripción', width: '250px' },
    { field: 'isoCode', header: 'Código ISO', width: '120px' },
    { field: 'timezone', header: 'Zona Horaria', width: '150px' },
    { field: 'lang', header: 'Idioma', width: '120px' },
    { field: 'currency', header: 'Moneda', width: '120px' }
  ];

  private tableDataSubject = new BehaviorSubject<any>({
    data: [],
    totalRecords: 0,
    isFirst: true
  });
  tableData$: Observable<any> = this.tableDataSubject.asObservable();
  
  // Getter para obtener el valor actual del observable (para debugging)
  get currentTableData() {
    return this.tableDataSubject.value;
  }

  form: FormGroup;
  searchForm: FormGroup;

  constructor(
    private countryService: CountryService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required]],
      description: [''],
      isoCode: [''],
      timezone: [''],
      lang: [''],
      currency: ['']
    });

    this.searchForm = this.fb.group({
      name: [''],
      description: ['']
    });
  }

  loadCountries(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    this.loading = true;
    this.error = null;
    
    const filters = {
      name: this.searchForm.value.name?.trim() || undefined,
      description: this.searchForm.value.description?.trim() || undefined
    };
    
    this.subscription = this.countryService.getPageable(this.page, this.size, filters)
      .subscribe({
        next: (data: CountryPageResponse) => {
          this.tableDataSubject.next({
            data: data.content,
            totalRecords: data.totalElements,
            isFirst: this.page === 0
          });
          this.loading = false;
        },
        error: (err) => {
          this.error = err?.error?.message || err?.message || 'Error al cargar los países';
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
    // Completar el subject para evitar memory leaks
    this.tableDataSubject.complete();
  }

  search(): void {
    this.page = 0;
    this.first = 0;
    this.onTablePagination({ page: 0, first: 0, rows: this.size, pageCount: 0 });
  }

  clearSearch(): void {
    this.searchForm.reset();
    this.search();
  }

  openCreateForm(): void {
    this.editingCountry = null;
    this.form.reset();
    this.showForm = true;
  }

  openEditForm(country: Country): void {
    this.editingCountry = country;
    this.form.patchValue({
      name: country.name || '',
      description: country.description || '',
      isoCode: country.isoCode || '',
      timezone: country.timezone || '',
      lang: country.lang || '',
      currency: country.currency || ''
    });
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingCountry = null;
    this.form.reset();
  }

  submitForm(): void {
    if (this.form.invalid) return;

    this.loading = true;
    this.error = null;

    const countryData: Country = {
      ...this.form.value,
      ...(this.editingCountry?.countryId && { countryId: this.editingCountry.countryId })
    };

    const operation = this.editingCountry
      ? this.countryService.update(countryData)
      : this.countryService.create(countryData);

    operation.subscribe({
      next: () => {
        this.loading = false;
        this.showForm = false;
        this.editingCountry = null;
        this.form.reset();
        this.loadCountries();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error al guardar el país';
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
    this.loadCountries();
  }
}

