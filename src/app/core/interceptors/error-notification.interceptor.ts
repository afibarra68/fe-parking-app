import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const errorNotificationInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const notificationService = inject(NotificationService);
  
  const isBrowser = isPlatformBrowser(platformId);

  return next(req).pipe(
    catchError((error) => {
      // Solo manejar errores en el navegador
      if (isBrowser && error.status === 412) {
        // Error 412: PRECONDITION_FAILED
        const errorMessage = error?.error?.message || 'La operación no se pudo completar debido a una condición previa no cumplida';
        const errorDetails = error?.error?.details || error?.error?.error || '';
        
        // Mostrar notificación de error 412
        notificationService.showPreconditionFailed(errorMessage, errorDetails);
      }

      // Re-lanzar el error para que otros interceptores o componentes puedan manejarlo
      return throwError(() => error);
    })
  );
};
