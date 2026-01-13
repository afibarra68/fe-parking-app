import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { EnumResource } from './enum.service';

export interface TicketTemplate {
  ticketTemplateId?: number;
  template?: string; // tirilla - contenido del template ESC/POS
  ticketType?: string | EnumResource; // tipo de tirilla (INGRESO, SALIDA, FACTURA, COMPROBANTE_INGRESO)
  invoice?: string; // factura - template para facturas
  entryReceipt?: string; // comprobante de ingreso - template para comprobantes de ingreso
  companyCompanyId?: number;
  userUserId?: number;
  printerPrinterId?: number; // relación con la impresora
  createdDate?: string;
  updatedDate?: string;
}

export interface TicketTemplatePageResponse {
  content: TicketTemplate[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({
  providedIn: 'root'
})
export class TicketTemplateService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiAuthJwt;

  // Listar con paginación
  getPageable(page: number, size: number, filters?: { 
    printerType?: string; 
    ticketType?: string; 
    companyCompanyId?: number;
    userUserId?: number;
  }): Observable<TicketTemplatePageResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (filters?.printerType) {
      params = params.set('printerType', filters.printerType);
    }
    if (filters?.ticketType) {
      params = params.set('ticketType', filters.ticketType);
    }
    if (filters?.companyCompanyId) {
      params = params.set('companyCompanyId', filters.companyCompanyId.toString());
    }
    if (filters?.userUserId) {
      params = params.set('userUserId', filters.userUserId.toString());
    }
    
    return this.http.get<TicketTemplatePageResponse>(`${this.apiUrl}/ticket-templates/pageable`, { params });
  }

  // Crear
  create(ticketTemplate: TicketTemplate): Observable<TicketTemplate> {
    return this.http.post<TicketTemplate>(`${this.apiUrl}/ticket-templates`, ticketTemplate);
  }

  // Actualizar
  update(ticketTemplate: TicketTemplate): Observable<TicketTemplate> {
    return this.http.put<TicketTemplate>(`${this.apiUrl}/ticket-templates`, ticketTemplate);
  }

  // Listar queryable (sin paginación, para dropdowns)
  getQueryable(filters?: { printerType?: string; ticketType?: string; companyCompanyId?: number }): Observable<TicketTemplate[]> {
    let params = new HttpParams();
    if (filters?.printerType) {
      params = params.set('printerType', filters.printerType);
    }
    if (filters?.ticketType) {
      params = params.set('ticketType', filters.ticketType);
    }
    if (filters?.companyCompanyId) {
      params = params.set('companyCompanyId', filters.companyCompanyId.toString());
    }
    return this.http.get<TicketTemplate[]>(`${this.apiUrl}/ticket-templates`, { params });
  }
}

