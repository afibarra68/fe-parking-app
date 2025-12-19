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

export interface UserRole {
  userRoleId?: number;
  appUserId?: number;
  firstName?: string;
  lastName?: string;
  secondName?: string;
  secondLastname?: string;
  numberIdentity?: string;
  role?: string;
  companyCompanyId?: number;
  companyName?: string;
}

export interface UserRolePageResponse {
  content: UserRole[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface CreateUserRole {
  numberIdentity: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserRoleService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiAuthJwt;

  // Listar con paginación
  getPageable(
    page: number, 
    size: number, 
    filters?: { userRoleId?: number; numberIdentity?: string; role?: string }
  ): Observable<UserRolePageResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (filters?.userRoleId) {
      params = params.set('userRoleId', filters.userRoleId.toString());
    }
    if (filters?.numberIdentity) {
      params = params.set('numberIdentity', filters.numberIdentity);
    }
    if (filters?.role) {
      params = params.set('role', filters.role);
    }
    
    return this.http.get<UserRolePageResponse>(`${this.apiUrl}/user_role/pageable`, { params });
  }

  // Crear relación usuario-rol
  create(userRole: CreateUserRole): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/user_role`, userRole);
  }

  // Actualizar relación usuario-rol
  update(userRoleId: number, userRole: CreateUserRole): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/user_role/${userRoleId}`, userRole);
  }

  // Eliminar relación usuario-rol
  delete(userRoleId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/user_role/${userRoleId}`);
  }

  // Obtener lista de roles disponibles
  getRoles(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/user_role/roles`);
  }
}

