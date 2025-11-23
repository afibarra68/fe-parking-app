import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { User, UserCreateRequest, UserUpdateRequest, UserQueryParams, UserCreatedResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiAuthJwt; // Usa /mt-api que pasa por el interceptor autenticado

  /**
   * Obtiene la lista de usuarios con filtros opcionales
   * Requiere autenticación (pasa por el interceptor)
   */
  getUsers(params?: UserQueryParams): Observable<User[]> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.appUserId) {
        httpParams = httpParams.set('appUserId', params.appUserId.toString());
      }
      if (params.numberIdentity?.trim()) {
        httpParams = httpParams.set('numberIdentity', params.numberIdentity.trim());
      }
      if (params.email?.trim()) {
        httpParams = httpParams.set('email', params.email.trim());
      }
      if (params.active !== undefined) {
        httpParams = httpParams.set('active', params.active.toString());
      }
    }

    return this.http.get<User[]>(`${this.apiUrl}/users`, { params: httpParams })
      .pipe(
        catchError(error => {
          console.error('Error al obtener usuarios:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Obtiene un usuario por ID
   * Requiere autenticación (pasa por el interceptor)
   */
  getUserById(appUserId: number): Observable<User[]> {
    return this.getUsers({ appUserId });
  }

  /**
   * Obtiene un usuario por número de identidad
   * Requiere autenticación (pasa por el interceptor)
   */
  getUserByNumberIdentity(numberIdentity: string): Observable<User[]> {
    return this.getUsers({ numberIdentity });
  }

  /**
   * Crea un nuevo usuario
   * Requiere autenticación (pasa por el interceptor)
   */
  createUser(user: UserCreateRequest): Observable<UserCreatedResponse> {
    return this.http.post<UserCreatedResponse>(`${this.apiUrl}/users/create_public_user`, user)
      .pipe(
        catchError(error => {
          console.error('Error al crear usuario:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Actualiza un usuario existente
   * Requiere autenticación (pasa por el interceptor)
   */
  updateUser(user: UserUpdateRequest): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users`, user)
      .pipe(
        catchError(error => {
          console.error('Error al actualizar usuario:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Elimina un usuario por número de documento
   * Requiere autenticación (pasa por el interceptor)
   */
  deleteUser(userDocument: number): Observable<UserCreatedResponse> {
    return this.http.post<UserCreatedResponse>(`${this.apiUrl}/users/down_public_user`, null, {
      params: new HttpParams().set('userDocument', userDocument.toString())
    })
      .pipe(
        catchError(error => {
          console.error('Error al eliminar usuario:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Busca usuarios por número de identidad
   * Requiere autenticación (pasa por el interceptor)
   */
  searchUsersByNumberIdentity(numberIdentity: string): Observable<User[]> {
    return this.getUsers({ numberIdentity });
  }
}

