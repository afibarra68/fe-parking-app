import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface Client {
  clientId?: number;
  fullName: string;
  typeIdentity?: string;
  numberIdentity?: string;
  people?: string;
  subscriptionValidity?: string; // Vigencia de suscripción (LocalDate from backend as string ISO format)
  clientCompanyId?: number;
  aceptedPlates?: string; // Placas separadas por comas: "OPO787,JHH787,IUIOP9"
}

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiAuthJwt;

  // Listar con paginación
  getPageable(page: number, size: number, filters?: { document?: string }): Observable<Page<Client>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (filters?.document) {
      params = params.set('document', filters.document);
    }
    
    return this.http.get<Page<Client>>(`${this.apiUrl}/client`, { params });
  }

  // Crear
  create(client: Client): Observable<Client> {
    return this.http.post<Client>(`${this.apiUrl}/client`, client);
  }

  // Actualizar
  update(client: Client): Observable<Client> {
    return this.http.put<Client>(`${this.apiUrl}/client`, client);
  }

  // Renovar período de pago
  renewPaymentPeriod(clientId: number): Observable<Client> {
    return this.http.post<Client>(`${this.apiUrl}/client/${clientId}/renew-period`, {});
  }
}

