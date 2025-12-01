import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Country } from './country.service';

export interface Company {
  companyId?: number;
  companyName: string;
  numberIdentity?: string;
  country?: Country;
  countryId?: number;
}

export interface CompanyPageResponse {
  content: Company[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiAuthJwt;

  // Listar con paginación
  getPageable(page: number, size: number, filters?: { companyName?: string; numberIdentity?: string }): Observable<CompanyPageResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (filters?.companyName) {
      params = params.set('companyName', filters.companyName);
    }
    if (filters?.numberIdentity) {
      params = params.set('numberIdentity', filters.numberIdentity);
    }
    
    return this.http.get<CompanyPageResponse>(`${this.apiUrl}/companies/pageable`, { params });
  }

  // Listar queryable (sin paginación, para dropdowns)
  getList(filters?: { companyName?: string; numberIdentity?: string }): Observable<Company[]> {
    let params = new HttpParams();
    if (filters?.companyName) {
      params = params.set('companyName', filters.companyName);
    }
    if (filters?.numberIdentity) {
      params = params.set('numberIdentity', filters.numberIdentity);
    }
    return this.http.get<Company[]>(`${this.apiUrl}/companies`, { params });
  }

  // Crear
  create(company: Company, countryName?: string): Observable<Company> {
    const payload: any = {
      companyName: company.companyName,
      numberIdentity: company.numberIdentity,
      country: company.countryId ? { 
        countryId: company.countryId,
        name: countryName || null
      } : null
    };
    return this.http.post<Company>(`${this.apiUrl}/companies`, payload);
  }

  // Actualizar
  update(company: Company, countryName?: string): Observable<Company> {
    const payload: any = {
      companyId: company.companyId,
      companyName: company.companyName,
      numberIdentity: company.numberIdentity,
      country: company.countryId ? { 
        countryId: company.countryId,
        name: countryName || null
      } : null
    };
    return this.http.put<Company>(`${this.apiUrl}/companies`, payload);
  }
}

