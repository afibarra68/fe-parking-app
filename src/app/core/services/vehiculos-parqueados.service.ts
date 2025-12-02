import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface VehiculoParqueado {
  openTransactionId?: number;
  vehiclePlate?: string;
  startTime?: string;
  startDay?: string;
  endDate?: string | null;
  endTime?: string | null;
  currency?: number;
  companyCompanyId?: number;
  status?: string;
  billingPriceBillingPriceId?: number | null;
  amount?: number;
  discount?: string | null;
  totalAmount?: number;
  timeElapsed?: string | null;
  operationDate?: string;
  serviceTypeServiceTypeId?: number | null;
  appUserAppUserSeller?: number | null;
  tipoVehiculo?: string;
}

@Injectable({
  providedIn: 'root'
})
export class VehiculosParqueadosService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiAuthJwt;

  // Listar vehículos parqueados (transacciones abiertas) con paginación
  getPageable(
    page: number, 
    size: number, 
    filters?: { status?: string; companyCompanyId?: number }
  ): Observable<Page<VehiculoParqueado>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (filters?.status) {
      params = params.set('status', filters.status);
    }
    
    if (filters?.companyCompanyId) {
      params = params.set('companyCompanyId', filters.companyCompanyId.toString());
    }
    
    return this.http.get<Page<VehiculoParqueado>>(`${this.apiUrl}/open-transactions`, { params });
  }

  // Obtener por ID
  getById(id: number): Observable<VehiculoParqueado> {
    return this.http.get<VehiculoParqueado>(`${this.apiUrl}/open-transactions/${id}`);
  }

  // Actualizar transacción
  update(vehiculo: VehiculoParqueado): Observable<VehiculoParqueado> {
    return this.http.put<VehiculoParqueado>(`${this.apiUrl}/open-transactions`, vehiculo);
  }
}

