# Configuración de Conexión Directa al Backend

## Cambio Realizado

Se ha configurado el frontend para que las peticiones vayan **directamente al backend** sin pasar por Nginx, evitando así el problema de redirecciones 302.

## Configuración

### Environment de Producción (`src/environments/environment.prod.ts`)

```typescript
apiAuthJwt: 'https://adminparquear-z6mc5.ondigitalocean.app',
apiUrl: 'https://adminparquear-z6mc5.ondigitalocean.app'
```

### Nginx (`nginx.conf`)

El bloque de servidor para `api-flux.alparquear.com` ha sido **deshabilitado/comentado** para que las peticiones no pasen por Nginx.

## Flujo Actual

```
Angular → POST https://adminparquear-z6mc5.ondigitalocean.app/auth/login
    ↓
Backend → Procesa la petición directamente
    ↓
Angular → Recibe respuesta (200 OK con JSON o error)
```

**No hay intermediarios** - Las peticiones van directamente del navegador al backend.

## Ventajas

1. **Sin 302**: No hay redirecciones intermedias que causen problemas
2. **Más rápido**: Menos saltos, menos latencia
3. **Más simple**: Menos configuración, menos puntos de fallo
4. **Respuestas directas**: El backend responde directamente al frontend

## Desventajas

1. **CORS**: El backend debe estar configurado para aceptar peticiones desde `admin.alparquear.com`
2. **Cookies**: Las cookies del backend se establecen para el dominio del backend, no del frontend
3. **Seguridad**: El navegador conoce la URL real del backend

## Requisitos del Backend

Para que funcione correctamente, el backend debe:

1. **CORS configurado**: Aceptar peticiones desde `https://admin.alparquear.com`
   ```javascript
   // Ejemplo en Express
   app.use(cors({
     origin: 'https://admin.alparquear.com',
     credentials: true
   }));
   ```

2. **Headers CORS**: Debe enviar los headers correctos:
   - `Access-Control-Allow-Origin: https://admin.alparquear.com`
   - `Access-Control-Allow-Credentials: true`
   - `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
   - `Access-Control-Allow-Headers: Authorization, Content-Type, Accept`

## Verificación

Para verificar que funciona:

1. **Abrir DevTools** (F12) → Network
2. **Hacer login**
3. **Verificar que las peticiones van a**: `https://adminparquear-z6mc5.ondigitalocean.app/auth/login`
4. **Verificar que no hay 302**: La respuesta debe ser 200 OK o 401 Unauthorized
5. **Verificar CORS**: No debe haber errores de CORS en la consola

## Troubleshooting

### Error de CORS

Si ves errores de CORS en la consola:

```
Access to XMLHttpRequest at 'https://adminparquear-z6mc5.ondigitalocean.app/auth/login' 
from origin 'https://admin.alparquear.com' has been blocked by CORS policy
```

**Solución**: Configurar CORS en el backend para aceptar peticiones desde `https://admin.alparquear.com`

### Cookies no se guardan

Si las cookies no se guardan después del login:

- Las cookies del backend se establecen para el dominio del backend (`adminparquear-z6mc5.ondigitalocean.app`)
- El navegador no enviará estas cookies en peticiones desde `admin.alparquear.com`
- **Solución**: Usar tokens JWT en lugar de cookies, o configurar el backend para establecer cookies con el dominio correcto

### Error 302 aún aparece

Si aún ves 302:

1. Verificar que el environment está usando la URL directa del backend
2. Limpiar caché del navegador
3. Verificar que el backend no está redirigiendo (hacer petición directa con curl)

## Alternativa: Volver a Usar Nginx

Si necesitas volver a usar Nginx como proxy:

1. **Editar `src/environments/environment.prod.ts`**:
   ```typescript
   apiAuthJwt: '/mt-api',
   apiUrl: '/mt-api'
   ```

2. **Descomentar el bloque de Nginx** para `api-flux.alparquear.com` o usar el bloque de `/mt-api` en `admin.alparquear.com`

3. **Recargar Nginx**: `nginx -s reload`
