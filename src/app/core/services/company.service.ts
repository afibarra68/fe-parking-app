import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Country } from './country.service';

export interface Company {
  companyId?: number;
  companyName: string;
  numberIdentity?: string;
  country?: Country;
  countryId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiAuthJwt;

  getCompanies(companyId?: number, companyName?: string, numberIdentity?: string): Observable<Company[]> {
    let params = new HttpParams();
    if (companyId) {
      params = params.set('companyId', companyId.toString());
    }
    if (companyName) {
      params = params.set('companyName', companyName);
    }
    if (numberIdentity) {
      params = params.set('numberIdentity', numberIdentity);
    }
    return this.http.get<Company[]>(`${this.apiUrl}/companies`, { params })
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  createCompany(company: Company, countryName?: string): Observable<Company> {
    // Transformar countryId a country: {countryId: ..., name: ...}
    const payload: any = {
      companyName: company.companyName,
      numberIdentity: company.numberIdentity,
      country: company.countryId ? { 
        countryId: company.countryId,
        name: countryName || null
      } : null
    };
    
    return this.http.post<Company>(`${this.apiUrl}/companies`, payload)
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  updateCompany(company: Company, countryName?: string): Observable<Company> {
    // Transformar countryId a country: {countryId: ..., name: ...}
    const payload: any = {
      companyId: company.companyId,
      companyName: company.companyName,
      numberIdentity: company.numberIdentity,
      country: company.countryId ? { 
        countryId: company.countryId,
        name: countryName || null
      } : null
    };
    
    return this.http.put<Company>(`${this.apiUrl}/companies`, payload)
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }
}

