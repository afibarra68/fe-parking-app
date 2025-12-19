import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { EnumResource } from './enum.service';

export interface BillingPrice {
  billingPriceId?: number;
  status?: EnumResource | string | null; // Puede ser EnumResource, string (id) o null
  dateStartDisabled?: string;
  coverType?: string;
  applyDiscount?: boolean;
  discountDiscountId?: number;
  companyCompanyId?: number;
  businessServiceBusinessServiceId?: number;
  start?: number; // DEPRECATED
  end?: number; // DEPRECATED
  hours?: number;
  mount?: number;
  tipoVehiculo?: EnumResource | string | null; // Puede ser EnumResource, string (id) o null
}

export interface BillingPricePageResponse {
  content: BillingPrice[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({
  providedIn: 'root'
})
export class BillingPriceService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiAuthJwt;

  // Listar con paginación
  getPageable(page: number, size: number, filters?: { status?: string; companyCompanyId?: number; tipoVehiculo?: string }): Observable<BillingPricePageResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (filters?.status) {
      params = params.set('status', filters.status);
    }
    if (filters?.companyCompanyId) {
      params = params.set('companyCompanyId', filters.companyCompanyId.toString());
    }
    if (filters?.tipoVehiculo) {
      params = params.set('tipoVehiculo', filters.tipoVehiculo);
    }

    return this.http.get<BillingPricePageResponse>(`${this.apiUrl}/billing-prices/pageable`, { params });
  }

  // Listar queryable (sin paginación, para dropdowns)
  getList(filters?: { status?: string; companyCompanyId?: number; tipoVehiculo?: string }): Observable<BillingPrice[]> {
    let params = new HttpParams();
    if (filters?.status) {
      params = params.set('status', filters.status);
    }
    if (filters?.companyCompanyId) {
      params = params.set('companyCompanyId', filters.companyCompanyId.toString());
    }
    if (filters?.tipoVehiculo) {
      params = params.set('tipoVehiculo', filters.tipoVehiculo);
    }
    return this.http.get<BillingPrice[]>(`${this.apiUrl}/billing-prices`, { params });
  }

  // Crear
  create(billingPrice: BillingPrice): Observable<BillingPrice> {
    return this.http.post<BillingPrice>(`${this.apiUrl}/billing-prices`, billingPrice);
  }

  // Actualizar
  update(billingPrice: BillingPrice): Observable<BillingPrice> {
    return this.http.put<BillingPrice>(`${this.apiUrl}/billing-prices`, billingPrice);
  }

  // Eliminar
  delete(billingPriceId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/billing-prices/${billingPriceId}`);
  }
}

