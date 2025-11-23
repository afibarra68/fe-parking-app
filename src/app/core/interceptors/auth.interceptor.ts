import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // No agregar token a las peticiones de login (públicas)
  if (req.url.includes('/auth/login') || req.url.includes('/users/create_public_user')) {
    return next(req);
  }

  // Solo agregar token a peticiones que van al API (y no son públicas)
  if (req.url.startsWith('/api') || req.url.startsWith('/mt-api')) {
    // Verificar que estamos en el navegador antes de acceder a localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const token = localStorage.getItem('auth_token');
        
        if (token) {
          const cloned = req.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`
            }
          });
          return next(cloned);
        }
      } catch (error) {
        console.warn('Error accessing localStorage in interceptor:', error);
      }
    }
  }
  
  return next(req);
};



