# Configuración de Proxy Interno con Nginx

## Cambios Realizados

### 1. Environment de Producción (`src/environments/environment.prod.ts`)

**Antes:**
```typescript
apiAuthJwt: 'https://api-flux.alparquear.com',
apiUrl: 'https://api-flux.alparquear.com'
```

**Después:**
```typescript
apiAuthJwt: '/mt-api',
apiUrl: '/mt-api'
```

**Razón:** Usar rutas relativas permite que Nginx maneje el proxy internamente. Todas las peticiones a `/mt-api/*` son capturadas por Nginx y redirigidas al backend sin que el navegador sepa la URL real del backend.

### 2. Flujo de Peticiones

```
Cliente (Navegador)
    ↓
    POST /mt-api/auth/login
    ↓
Nginx (admin.alparquear.com)
    ↓
    Detecta /mt-api y hace proxy interno
    ↓
Backend (adminparquear-z6mc5.ondigitalocean.app)
    ↓
    POST /auth/login
    ↓
    Respuesta (200 OK con JSON o 302 Found)
    ↓
Nginx
    ↓
    Reescribe headers si es necesario
    ↓
Cliente
```

### 3. Ventajas de Usar Rutas Relativas

1. **Seguridad**: El navegador no conoce la URL real del backend
2. **Flexibilidad**: Puedes cambiar el backend sin modificar el código del frontend
3. **CORS**: No hay problemas de CORS porque todo pasa por el mismo dominio
4. **Cookies**: Las cookies se manejan correctamente porque todo está en el mismo dominio

### 4. Configuración de Nginx

Nginx está configurado para:

1. **Capturar peticiones a `/mt-api/*`**: Usa regex `~ ^/mt-api(/.*)?$`
2. **Eliminar el prefijo `/mt-api`**: Usa `rewrite ^/mt-api(/.*)?$ $1 break;`
3. **Hacer proxy al backend**: `proxy_pass https://adminparquear-z6mc5.ondigitalocean.app;`
4. **Reescribir redirecciones**: `proxy_redirect` reescribe las redirecciones del backend para mantener el contexto interno
5. **Manejar cookies**: `proxy_cookie_domain` y `proxy_cookie_path` reescriben las cookies

### 5. Ejemplo de Petición

**Frontend (Angular):**
```typescript
this.http.post('/mt-api/auth/login', credentials)
```

**Navegador envía:**
```
POST https://admin.alparquear.com/mt-api/auth/login
```

**Nginx recibe y reescribe:**
```
POST https://adminparquear-z6mc5.ondigitalocean.app/auth/login
```

**Backend responde:**
```
200 OK con JSON o 302 Found con location
```

**Nginx reescribe la respuesta (si es 302):**
```
302 Found con location: /mt-api/administration/dashboard
```

**Navegador recibe:**
```
302 Found con location: /mt-api/administration/dashboard
```

### 6. Nota sobre el 302

Si el backend devuelve un 302 con `location: /administration/dashboard`, el navegador seguirá automáticamente esa redirección. Sin embargo, esa ruta no está bajo `/mt-api`, por lo que Nginx la pasará a Node.js (SSR), no al backend.

**Recomendación:** El backend debería devolver un 200 OK con JSON en lugar de un 302 para peticiones de API REST. Las redirecciones deberían manejarse en el frontend después de recibir la respuesta JSON.

### 7. Verificación

Para verificar que la configuración funciona:

1. **Abrir las herramientas de desarrollo** (F12)
2. **Ir a la pestaña Network**
3. **Hacer login**
4. **Verificar que las peticiones van a `/mt-api/*`** (no a URLs absolutas del backend)
5. **Verificar que las respuestas son correctas**

### 8. Troubleshooting

**Problema:** Las peticiones van directamente al backend (no pasan por Nginx)
- **Solución:** Verificar que `environment.prod.ts` usa rutas relativas (`/mt-api`), no URLs absolutas

**Problema:** Error 404 en las peticiones a `/mt-api/*`
- **Solución:** Verificar que Nginx está corriendo y que la configuración de `location ~ ^/mt-api(/.*)?$` está correcta

**Problema:** Error de CORS
- **Solución:** Verificar que los headers de CORS están configurados en Nginx (ya están configurados)

**Problema:** Las cookies no se guardan
- **Solución:** Verificar que `proxy_cookie_domain` y `proxy_cookie_path` están configurados correctamente (ya están configurados)
