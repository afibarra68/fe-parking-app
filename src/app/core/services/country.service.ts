import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Country {
  countryId?: number;
  name: string;
  description?: string;
  isoCode?: string;
  timezone?: string;
  lang?: string;
  currency?: string;
}

export interface CountryPageResponse {
  content: Country[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({
  providedIn: 'root'
})
export class CountryService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiAuthJwt;

  // Listar con paginación
  getPageable(page: number, size: number, filters?: { name?: string; description?: string }): Observable<CountryPageResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (filters?.name) {
      params = params.set('name', filters.name);
    }
    if (filters?.description) {
      params = params.set('description', filters.description);
    }
    
    return this.http.get<CountryPageResponse>(`${this.apiUrl}/countries/pageable`, { params });
  }

  // Crear
  create(country: Country): Observable<Country> {
    return this.http.post<Country>(`${this.apiUrl}/countries`, country);
  }

  // Actualizar
  update(country: Country): Observable<Country> {
    return this.http.put<Country>(`${this.apiUrl}/countries`, country);
  }

  // Listar queryable (sin paginación, para dropdowns)
  getQueryable(filters?: { name?: string }): Observable<Country[]> {
    let params = new HttpParams();
    if (filters?.name) {
      params = params.set('name', filters.name);
    }
    return this.http.get<Country[]>(`${this.apiUrl}/countries/queryable`, { params });
  }
}

