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

export interface ClosedTransaction {
  closedTransactionId?: number;
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
  sellerAppUserId?: number | null;
  sellerName?: string | null;
  contractor?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class ClosedTransactionsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiAuthJwt;

  // Listar transacciones cerradas con paginación
  getPageable(
    page: number, 
    size: number, 
    filters?: { status?: string; companyCompanyId?: number; operationDateFrom?: string; operationDateTo?: string }
  ): Observable<Page<ClosedTransaction>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (filters?.status) {
      params = params.set('status', filters.status);
    }
    
    if (filters?.companyCompanyId) {
      params = params.set('companyCompanyId', filters.companyCompanyId.toString());
    }
    
    if (filters?.operationDateFrom) {
      params = params.set('operationDateFrom', filters.operationDateFrom);
    }
    
    if (filters?.operationDateTo) {
      params = params.set('operationDateTo', filters.operationDateTo);
    }
    
    return this.http.get<Page<ClosedTransaction>>(`${this.apiUrl}/closed-transactions`, { params });
  }

  // Obtener por ID
  getById(id: number): Observable<ClosedTransaction> {
    return this.http.get<ClosedTransaction>(`${this.apiUrl}/closed-transactions/${id}`);
  }

  // Actualizar transacción
  update(transaction: ClosedTransaction): Observable<ClosedTransaction> {
    return this.http.put<ClosedTransaction>(`${this.apiUrl}/closed-transactions`, transaction);
  }
}

