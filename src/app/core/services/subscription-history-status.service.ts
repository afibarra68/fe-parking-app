import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { EnumResource } from './enum.service';

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface SubscriptionHistoryStatus {
  sid?: number;
  clientId?: number;
  plates?: string;
  liquidationStatus?: EnumResource | string;
  companyId?: number;
  liquidationDate?: string; // LocalDate from backend as string (ISO format)
  destinationEmail?: string;
  createdAt?: string; // LocalDateTime from backend as string (ISO format)
  // Campos adicionales para visualización
  clientFullName?: string;
  clientNumberIdentity?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionHistoryStatusService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiAuthJwt;

  // Listar con paginación y filtros
  getPageable(
    page: number,
    size: number,
    filters?: {
      companyId?: number;
      clientId?: number;
      numberIdentity?: string;
    }
  ): Observable<Page<SubscriptionHistoryStatus>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (filters?.companyId) {
      params = params.set('companyId', filters.companyId.toString());
    }
    if (filters?.clientId) {
      params = params.set('clientId', filters.clientId.toString());
    }
    if (filters?.numberIdentity) {
      params = params.set('numberIdentity', filters.numberIdentity);
    }

    return this.http.get<Page<SubscriptionHistoryStatus>>(
      `${this.apiUrl}/subscription-history-status`,
      { params }
    );
  }

  // Crear
  create(history: SubscriptionHistoryStatus): Observable<SubscriptionHistoryStatus> {
    return this.http.post<SubscriptionHistoryStatus>(
      `${this.apiUrl}/subscription-history-status`,
      history
    );
  }

  // Liquidar
  liquidate(sid: number): Observable<SubscriptionHistoryStatus> {
    return this.http.post<SubscriptionHistoryStatus>(
      `${this.apiUrl}/subscription-history-status/${sid}/liquidate`,
      {}
    );
  }
}
