import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  
  // Verificar si estamos en el navegador antes de usar localStorage
  const isBrowser = isPlatformBrowser(platformId);
  const token = isBrowser ? localStorage.getItem('auth_token') : null;

  console.log('Interceptor - URL:', req.url);
  console.log('Interceptor - Token existe:', !!token);
  console.log('Interceptor - Token:', token ? token.substring(0, 20) + '...' : 'null');

  // Clonar la petición y agregar el header de autorización si existe el token
  let authReq = req;

  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('Interceptor - Header Authorization agregado');
  } else {
    console.warn('Interceptor - No hay token disponible para la petición:', req.url);
  }

  // Ejecutar la petición y manejar errores
  return next(authReq).pipe(
    catchError((error) => {
      console.error('Interceptor - Error en petición:', error.status, error.url);
      
      // Solo manejar errores en el navegador
      if (isBrowser) {
        // Si el error es 401 (No autorizado), redirigir al login
        if (error.status === 401) {
          console.error('Interceptor - 401 Unauthorized, redirigiendo al login');
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
          router.navigate(['/auth/login']);
        }

        // Si el error es 403 (Prohibido), mostrar mensaje
        if (error.status === 403) {
          console.error('Interceptor - 403 Forbidden:', error);
          console.error('Interceptor - URL de la petición:', error.url);
          console.error('Interceptor - Headers enviados:', authReq.headers.keys());
        }
      }

      return throwError(() => error);
    })
  );
};

