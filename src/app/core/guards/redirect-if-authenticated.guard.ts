import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Roles que tienen acceso a la administración
 * Si el usuario tiene alguno de estos roles y está autenticado,
 * se redirige al dashboard en lugar de permitir acceso al login
 */
const ADMIN_ROLES = [
  'SUPER_USER',
  'SUPER_ADMIN',
  'ADMINISTRATOR_PRINCIPAL',
  'ADMIN_APP',
  'USER_APP',
  'AUDIT_SELLER',
  'PARKING_ATTENDANT'
];

/**
 * Guard que previene que usuarios autenticados con roles administrativos
 * accedan a las páginas de autenticación
 * Si el usuario tiene un rol administrativo y está autenticado, redirige al dashboard
 * Si no está autenticado o no tiene rol administrativo, permite acceso al login
 */
export const redirectIfAuthenticatedGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si no está autenticado, permitir acceso al login
  if (!authService.isAuthenticated()) {
    return true;
  }

  // Verificar si el usuario tiene algún rol administrativo
  const hasAdminRole = ADMIN_ROLES.some(role => authService.hasRole(role));

  // Si tiene rol administrativo, redirigir al dashboard
  if (hasAdminRole) {
    router.navigate(['/administration/dashboard'], { replaceUrl: true });
    return false;
  }

  // Si está autenticado pero no tiene rol administrativo, permitir acceso al login
  return true;
};

