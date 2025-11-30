import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BusinessService {
  businessServiceId?: number;
  principalName: string;
  description?: string;
  code: string;
  createdDate?: string;
}

export interface BusinessServicePageResponse {
  content: BusinessService[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({
  providedIn: 'root'
})
export class BusinessServiceService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiAuthJwt;

  // Listar con paginación
  getPageable(page: number, size: number, filters?: { principalName?: string; code?: string }): Observable<BusinessServicePageResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (filters?.principalName) {
      params = params.set('principalName', filters.principalName);
    }
    if (filters?.code) {
      params = params.set('code', filters.code);
    }
    
    return this.http.get<BusinessServicePageResponse>(`${this.apiUrl}/business-services/pageable`, { params });
  }

  // Crear
  create(businessService: BusinessService): Observable<BusinessService> {
    return this.http.post<BusinessService>(`${this.apiUrl}/business-services`, businessService);
  }

  // Actualizar
  update(businessService: BusinessService): Observable<BusinessService> {
    return this.http.put<BusinessService>(`${this.apiUrl}/business-services`, businessService);
  }

  // Listar queryable (sin paginación, para dropdowns)
  getQueryable(filters?: { principalName?: string }): Observable<BusinessService[]> {
    let params = new HttpParams();
    if (filters?.principalName) {
      params = params.set('principalName', filters.principalName);
    }
    return this.http.get<BusinessService[]>(`${this.apiUrl}/business-services`, { params });
  }
}

