import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Company } from './company.service';
import { BusinessService } from './business-service.service';

export interface CompanyBusinessService {
  companyBusinessServiceId?: number;
  company?: Company;
  businessService?: BusinessService;
  createdDate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CompanyBusinessServiceService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiAuthJwt;

  // Listar
  getList(filters?: { companyId?: number; businessServiceId?: number }): Observable<CompanyBusinessService[]> {
    let params = new HttpParams();
    if (filters?.companyId) {
      params = params.set('companyId', filters.companyId.toString());
    }
    if (filters?.businessServiceId) {
      params = params.set('businessServiceId', filters.businessServiceId.toString());
    }
    return this.http.get<CompanyBusinessService[]>(`${this.apiUrl}/company-business-services`, { params });
  }

  // Listar por companyId
  getByCompanyId(companyId: number): Observable<CompanyBusinessService[]> {
    return this.http.get<CompanyBusinessService[]>(`${this.apiUrl}/company-business-services/by-company/${companyId}`);
  }

  // Crear
  create(companyBusinessService: CompanyBusinessService): Observable<CompanyBusinessService> {
    return this.http.post<CompanyBusinessService>(`${this.apiUrl}/company-business-services`, companyBusinessService);
  }

  // Actualizar
  update(companyBusinessService: CompanyBusinessService): Observable<CompanyBusinessService> {
    return this.http.put<CompanyBusinessService>(`${this.apiUrl}/company-business-services`, companyBusinessService);
  }

  // Eliminar
  delete(companyBusinessServiceId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/company-business-services/${companyBusinessServiceId}`);
  }
}

