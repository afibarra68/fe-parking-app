import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserPrinterType {
  userPrinterTypeId?: number;
  userUserId?: number;
  printerType?: string; // COM, WINDOWS, NETWORK
  isEnabled?: boolean;
  createdDate?: string;
  updatedDate?: string;
}

export interface UserPrinterTypePageResponse {
  content: UserPrinterType[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserPrinterTypeService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiAuthJwt;

  // Listar con paginación
  getPageable(page: number, size: number, filters?: { 
    userUserId?: number; 
    printerType?: string; 
    isEnabled?: boolean;
  }): Observable<UserPrinterTypePageResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (filters?.userUserId) {
      params = params.set('userUserId', filters.userUserId.toString());
    }
    if (filters?.printerType) {
      params = params.set('printerType', filters.printerType);
    }
    if (filters?.isEnabled !== undefined) {
      params = params.set('isEnabled', filters.isEnabled.toString());
    }
    
    return this.http.get<UserPrinterTypePageResponse>(`${this.apiUrl}/user-printer-types/pageable`, { params });
  }

  // Crear
  create(userPrinterType: UserPrinterType): Observable<UserPrinterType> {
    return this.http.post<UserPrinterType>(`${this.apiUrl}/user-printer-types`, userPrinterType);
  }

  // Actualizar
  update(userPrinterType: UserPrinterType): Observable<UserPrinterType> {
    return this.http.put<UserPrinterType>(`${this.apiUrl}/user-printer-types`, userPrinterType);
  }

  // Eliminar
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/user-printer-types/${id}`);
  }

  // Listar queryable (sin paginación, para dropdowns)
  getQueryable(filters?: { userUserId?: number; printerType?: string }): Observable<UserPrinterType[]> {
    let params = new HttpParams();
    if (filters?.userUserId) {
      params = params.set('userUserId', filters.userUserId.toString());
    }
    if (filters?.printerType) {
      params = params.set('printerType', filters.printerType);
    }
    return this.http.get<UserPrinterType[]>(`${this.apiUrl}/user-printer-types`, { params });
  }
}

