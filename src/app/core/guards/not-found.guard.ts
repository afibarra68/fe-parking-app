import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard para manejar rutas no encontradas (404)
 * Si el usuario está autenticado, redirige al dashboard
 * Si no está autenticado, redirige al login
 * 
 * IMPORTANTE: Este guard solo se ejecuta para rutas que realmente no existen.
 * Las rutas dentro de módulos lazy-loaded (como /administration/*) son manejadas
 * por sus propios módulos y no deberían llegar aquí.
 */
export const notFoundGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si llegamos aquí, es porque ninguna ruta coincidió
  // Redirigir según el estado de autenticación
  if (authService.isAuthenticated()) {
    router.navigate(['/administration/dashboard'], { replaceUrl: true });
  } else {
    router.navigate(['/auth/login'], { replaceUrl: true });
  }
  
  return false;
};

