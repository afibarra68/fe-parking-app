import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Country, CountryCreateRequest, CountryUpdateRequest, CountryQueryParams } from '../models/country.model';

@Injectable({
  providedIn: 'root'
})
export class CountryService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiAuthJwt; // Usa /mt-api que pasa por el interceptor autenticado

  /**
   * Obtiene la lista de países con filtros opcionales
   * Requiere autenticación (pasa por el interceptor)
   * Optimizado para respuestas rápidas (< 1 segundo)
   */
  getCountries(params?: CountryQueryParams): Observable<Country[]> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.countryId) {
        httpParams = httpParams.set('countryId', params.countryId.toString());
      }
      if (params.description?.trim()) {
        httpParams = httpParams.set('description', params.description.trim());
      }
    }

    return this.http.get<Country[]>(`${this.apiUrl}/countries`, { params: httpParams })
      .pipe(
        catchError(error => {
          console.error('Error al obtener países:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Obtiene un país por ID
   * Requiere autenticación (pasa por el interceptor)
   */
  getCountryById(countryId: number): Observable<Country[]> {
    return this.getCountries({ countryId });
  }

  /**
   * Crea un nuevo país
   * Requiere autenticación (pasa por el interceptor)
   */
  createCountry(country: CountryCreateRequest): Observable<Country> {
    return this.http.post<Country>(`${this.apiUrl}/countries`, country)
      .pipe(
        catchError(error => {
          console.error('Error al crear país:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Actualiza un país existente
   * Requiere autenticación (pasa por el interceptor)
   */
  updateCountry(country: CountryUpdateRequest): Observable<Country> {
    return this.http.put<Country>(`${this.apiUrl}/countries`, country)
      .pipe(
        catchError(error => {
          console.error('Error al actualizar país:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Busca países por descripción
   * Requiere autenticación (pasa por el interceptor)
   */
  searchCountriesByDescription(description: string): Observable<Country[]> {
    return this.getCountries({ description });
  }
}

