import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserPrinter {
  userPrinterId?: number;
  userUserId?: number;
  printerPrinterId?: number;
  isActive?: boolean;
  createdDate?: string;
  updatedDate?: string;
}

export interface UserPrinterPageResponse {
  content: UserPrinter[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserPrinterService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiAuthJwt;

  // Listar con paginación
  getPageable(page: number, size: number, filters?: { 
    userUserId?: number; 
    printerPrinterId?: number; 
    isActive?: boolean;
  }): Observable<UserPrinterPageResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (filters?.userUserId) {
      params = params.set('userUserId', filters.userUserId.toString());
    }
    if (filters?.printerPrinterId) {
      params = params.set('printerPrinterId', filters.printerPrinterId.toString());
    }
    if (filters?.isActive !== undefined) {
      params = params.set('isActive', filters.isActive.toString());
    }
    
    return this.http.get<UserPrinterPageResponse>(`${this.apiUrl}/user-printers/pageable`, { params });
  }

  // Crear
  create(userPrinter: UserPrinter): Observable<UserPrinter> {
    return this.http.post<UserPrinter>(`${this.apiUrl}/user-printers`, userPrinter);
  }

  // Actualizar
  update(userPrinter: UserPrinter): Observable<UserPrinter> {
    return this.http.put<UserPrinter>(`${this.apiUrl}/user-printers`, userPrinter);
  }

  // Eliminar
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/user-printers/${id}`);
  }

  // Listar queryable (sin paginación, para dropdowns)
  getQueryable(filters?: { userUserId?: number; printerPrinterId?: number }): Observable<UserPrinter[]> {
    let params = new HttpParams();
    if (filters?.userUserId) {
      params = params.set('userUserId', filters.userUserId.toString());
    }
    if (filters?.printerPrinterId) {
      params = params.set('printerPrinterId', filters.printerPrinterId.toString());
    }
    return this.http.get<UserPrinter[]>(`${this.apiUrl}/user-printers`, { params });
  }
}

