import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Printer {
  printerId?: number;
  printerName: string;
  printerType?: string; // COM, WINDOWS, NETWORK
  connectionString?: string; // COM port, printer name, or network address
  isActive?: boolean;
  companyCompanyId?: number;
  userUserId?: number;
  createdDate?: string;
  updatedDate?: string;
}

export interface PrinterPageResponse {
  content: Printer[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({
  providedIn: 'root'
})
export class PrinterService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiAuthJwt;

  // Listar con paginación
  getPageable(page: number, size: number, filters?: { 
    printerName?: string; 
    printerType?: string; 
    companyCompanyId?: number;
    userUserId?: number;
    isActive?: boolean;
  }): Observable<PrinterPageResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (filters?.printerName) {
      params = params.set('printerName', filters.printerName);
    }
    if (filters?.printerType) {
      params = params.set('printerType', filters.printerType);
    }
    if (filters?.companyCompanyId) {
      params = params.set('companyCompanyId', filters.companyCompanyId.toString());
    }
    if (filters?.userUserId) {
      params = params.set('userUserId', filters.userUserId.toString());
    }
    if (filters?.isActive !== undefined) {
      params = params.set('isActive', filters.isActive.toString());
    }
    
    return this.http.get<PrinterPageResponse>(`${this.apiUrl}/printers/pageable`, { params });
  }

  // Crear
  create(printer: Printer): Observable<Printer> {
    return this.http.post<Printer>(`${this.apiUrl}/printers`, printer);
  }

  // Actualizar
  update(printer: Printer): Observable<Printer> {
    return this.http.put<Printer>(`${this.apiUrl}/printers`, printer);
  }

  // Listar queryable (sin paginación, para dropdowns)
  getQueryable(filters?: { printerName?: string; printerType?: string; companyCompanyId?: number }): Observable<Printer[]> {
    let params = new HttpParams();
    if (filters?.printerName) {
      params = params.set('printerName', filters.printerName);
    }
    if (filters?.printerType) {
      params = params.set('printerType', filters.printerType);
    }
    if (filters?.companyCompanyId) {
      params = params.set('companyCompanyId', filters.companyCompanyId.toString());
    }
    return this.http.get<Printer[]>(`${this.apiUrl}/printers`, { params });
  }
}

