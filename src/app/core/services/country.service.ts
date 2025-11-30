import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

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

  getCountries(countryId?: number, description?: string): Observable<Country[]> {
    let params = new HttpParams();
    if (countryId) {
      params = params.set('countryId', countryId.toString());
    }
    if (description) {
      params = params.set('description', description);
    }
    return this.http.get<Country[]>(`${this.apiUrl}/countries`, { params })
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  createCountry(country: Country): Observable<Country> {
    return this.http.post<Country>(`${this.apiUrl}/countries`, country)
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  updateCountry(country: Country): Observable<Country> {
    return this.http.put<Country>(`${this.apiUrl}/countries`, country)
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  getCountriesPageable(
    page: number = 0,
    size: number = 10,
    countryId?: number,
    description?: string,
    name?: string
  ): Observable<CountryPageResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (countryId) {
      params = params.set('countryId', countryId.toString());
    }
    if (description) {
      params = params.set('description', description);
    }
    if (name) {
      params = params.set('name', name);
    }
    
    return this.http.get<CountryPageResponse>(`${this.apiUrl}/countries/pageable`, { params })
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  getCountriesQueryable(
    countryId?: number,
    description?: string,
    name?: string
  ): Observable<Country[]> {
    let params = new HttpParams();
    
    if (countryId) {
      params = params.set('countryId', countryId.toString());
    }
    if (description) {
      params = params.set('description', description);
    }
    if (name) {
      params = params.set('name', name);
    }
    
    return this.http.get<Country[]>(`${this.apiUrl}/countries/queryable`, { params })
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }
}

