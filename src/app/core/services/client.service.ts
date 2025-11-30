import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
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

export interface Client {
  clientId?: number;
  fullName: string;
  typeIdentity?: string;
  numberIdentity?: string;
  people?: string;
  paymentDay?: string;
  clientCompanyId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiAuthJwt;

  getClients(document?: string, page: number = 0, size: number = 10): Observable<Page<Client>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (document) {
      params = params.set('document', document);
    }
    
    return this.http.get<Page<Client>>(`${this.apiUrl}/client`, { params })
      .pipe(
        catchError(error => {
          console.error('Error al obtener clientes:', error);
          return throwError(() => error);
        })
      );
  }

  createClient(client: Client): Observable<Client> {
    return this.http.post<Client>(`${this.apiUrl}/client`, client)
      .pipe(
        catchError(error => {
          console.error('Error al crear cliente:', error);
          return throwError(() => error);
        })
      );
  }

  updateClient(client: Client): Observable<Client> {
    return this.http.put<Client>(`${this.apiUrl}/client`, client)
      .pipe(
        catchError(error => {
          console.error('Error al actualizar cliente:', error);
          return throwError(() => error);
        })
      );
  }
}

