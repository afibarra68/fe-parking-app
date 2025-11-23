import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError, map, switchMap, startWith } from 'rxjs/operators';
import { CountryService } from '../../../core/services/country.service';
import { Country, CountryCreateRequest, CountryUpdateRequest, CountryQueryParams } from '../../../core/models/country.model';

interface CountriesState {
  countries: Country[];
  error: string | null;
  loading: boolean;
}

@Component({
  selector: 'app-countries',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './countries.component.html',
  styleUrls: ['./countries.component.scss']
})
export class CountriesComponent implements OnInit {
  // Signals para estado reactivo
  searchTerm = signal<string>('');
  showForm = signal<boolean>(false);
  editingCountry = signal<Country | null>(null);
  error = signal<string | null>(null);
  
  // Observable para los países
  countries$: Observable<Country[]>;
  countriesState$: Observable<CountriesState>;
  
  // Formulario para crear/editar
  countryForm: FormGroup;
  
  // Subject para disparar recargas
  private reloadSubject = new BehaviorSubject<void>(undefined);

  constructor(
    private countryService: CountryService,
    private fb: FormBuilder
  ) {
    this.countryForm = this.fb.group({
      name: [''],
      description: [''],
      isoCode: [''],
      timezone: [''],
      lang: [''],
      currency: ['']
    });

    // Observable que reacciona a cambios en searchTerm y reloadSubject
    this.countries$ = this.reloadSubject.pipe(
      switchMap(() => {
        const params = this.getSearchParams();
        return this.countryService.getCountries(params).pipe(
          catchError(err => {
            this.handleError(err);
            return of([]);
          })
        );
      })
    );

    // Estado completo con loading y error
    this.countriesState$ = this.countries$.pipe(
      map(countries => ({
        countries: Array.isArray(countries) ? countries : [],
        error: this.error(),
        loading: false
      })),
      startWith({ countries: [], error: null, loading: true })
    );
  }

  ngOnInit(): void {
    this.loadCountries();
  }

  private getSearchParams(): CountryQueryParams | undefined {
    const term = this.searchTerm().trim();
    return term ? { description: term } : undefined;
  }

  loadCountries(): void {
    this.error.set(null);
    this.reloadSubject.next();
  }

  private handleError(err: any): void {
    let errorMessage = 'Error al cargar los países';
    
    if (err?.status === 401 || err?.status === 403) {
      errorMessage = 'No tiene permisos para acceder a esta información';
    } else if (err?.status === 0) {
      errorMessage = 'Error de conexión con el servidor. Verifique que el backend esté disponible en http://localhost:9000';
    } else if (err?.status === 500) {
      errorMessage = 'Error interno del servidor. Por favor, contacte al administrador.';
    } else if (err?.status === 404) {
      errorMessage = 'El endpoint no fue encontrado. Verifique la configuración del backend.';
    } else {
      errorMessage = err?.error?.message || err?.message || errorMessage;
    }
    
    this.error.set(errorMessage);
    console.error('Error loading countries:', err);
  }

  search(): void {
    this.loadCountries();
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.loadCountries();
  }

  onSearchTermChange(value: string): void {
    this.searchTerm.set(value);
  }

  openCreateForm(): void {
    this.editingCountry.set(null);
    this.countryForm.reset();
    this.showForm.set(true);
  }

  openEditForm(country: Country): void {
    this.editingCountry.set(country);
    this.countryForm.patchValue({
      name: country.name || '',
      description: country.description || '',
      isoCode: country.isoCode || '',
      timezone: country.timezone || '',
      lang: country.lang || '',
      currency: country.currency || ''
    });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingCountry.set(null);
    this.countryForm.reset();
    this.error.set(null);
  }

  saveCountry(): void {
    if (this.countryForm.invalid) {
      return;
    }

    this.error.set(null);

    const editing = this.editingCountry();
    const operation$ = editing
      ? this.countryService.updateCountry({
          countryId: editing.countryId!,
          ...this.countryForm.value
        } as CountryUpdateRequest)
      : this.countryService.createCountry(this.countryForm.value as CountryCreateRequest);

    operation$.subscribe({
      next: () => {
        this.closeForm();
        this.loadCountries();
      },
      error: (err) => {
        const errorMsg = err?.error?.message || (editing ? 'Error al actualizar el país' : 'Error al crear el país');
        this.error.set(errorMsg);
      }
    });
  }

  deleteCountry(country: Country): void {
    if (!confirm(`¿Está seguro de eliminar el país ${country.name}?`)) {
      return;
    }

    // Nota: Si el backend tiene endpoint DELETE, agregarlo aquí
    // Por ahora solo mostramos un mensaje
    this.error.set('Funcionalidad de eliminación pendiente de implementar en el backend');
  }

  // Getters computados para el template
  get isEditing(): boolean {
    return this.editingCountry() !== null;
  }

  get currentError(): string | null {
    return this.error();
  }
}

