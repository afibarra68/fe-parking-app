# Solución al Error 302 en Producción

## Problema Identificado

El backend estaba devolviendo un **302 (Found/Redirect)** en producción cuando el frontend intentaba hacer peticiones a través de Nginx.

## Causa Raíz

La configuración de Nginx tenía varios problemas:

1. **Location con slash final**: `location /mt-api/` solo capturaba URLs que tenían el slash después de `/mt-api`, pero el frontend envía peticiones como `/mt-api/auth/login` (sin slash).

2. **Proxy_pass con slash**: El `proxy_pass` tenía un slash al final que causaba que Nginx eliminara incorrectamente el prefijo `/mt-api`.

3. **Proxy_redirect mal configurado**: Las redirecciones del backend no se estaban reescribiendo correctamente, causando que el navegador intentara redirigir fuera del dominio.

## Solución Implementada

### Cambios en `nginx.conf`

1. **Location con regex**: Cambiado de `location /mt-api/` a `location ~ ^/mt-api(/.*)?$` para capturar tanto `/mt-api` como `/mt-api/` y cualquier path después.

2. **Rewrite para eliminar prefijo**: Agregado `rewrite ^/mt-api(/.*)?$ $1 break;` para eliminar el prefijo `/mt-api` antes de hacer el proxy.

3. **Proxy_pass sin slash**: El `proxy_pass` ahora apunta a `https://adminparquear-z6mc5.ondigitalocean.app` sin slash final.

4. **Proxy_redirect mejorado**: Configurado para reescribir todas las posibles redirecciones del backend (HTTP y HTTPS, con y sin slash).

## Configuración Final

```nginx
location ~ ^/mt-api(/.*)?$ {
    proxy_ssl_server_name on;
    proxy_ssl_protocols TLSv1.2 TLSv1.3;
    
    # Reescribir la URL para eliminar el prefijo /mt-api
    rewrite ^/mt-api(/.*)?$ $1 break;
    
    # Proxy hacia el backend
    proxy_pass https://adminparquear-z6mc5.ondigitalocean.app;
    
    # Headers y configuración...
}
```

## Flujo de Petición

### Antes (con error 302):
1. Frontend: `GET /mt-api/auth/login`
2. Nginx: No coincide con `location /mt-api/` (falta el slash)
3. Nginx: Redirige a otra location o devuelve 302

### Después (corregido):
1. Frontend: `GET /mt-api/auth/login`
2. Nginx: Coincide con `location ~ ^/mt-api(/.*)?$`
3. Nginx: Rewrite elimina `/mt-api` → `/auth/login`
4. Nginx: Proxy a `https://adminparquear-z6mc5.ondigitalocean.app/auth/login`
5. Backend: Procesa la petición
6. Nginx: Reescribe cualquier redirección del backend para mantener `/mt-api` en la URL

## Verificación

Para verificar que funciona correctamente:

1. **Revisar logs de Nginx**:
   ```bash
   tail -f /var/log/nginx/access.log
   tail -f /var/log/nginx/error.log
   ```

2. **Probar una petición directa**:
   ```bash
   curl -v http://admin.alparquear.com/mt-api/auth/login
   ```

3. **Verificar en el navegador**:
   - Abrir DevTools → Network
   - Hacer una petición de login
   - Verificar que no haya redirecciones 302
   - Verificar que la respuesta sea 200 o 401 (no 302)

## Notas Importantes

- El `rewrite` con `break` es crucial para que Nginx no procese más reglas después de reescribir.
- El `proxy_redirect` debe cubrir todas las variantes posibles de redirección del backend.
- Los headers `X-Forwarded-*` son importantes para que el backend sepa la URL original.

## Troubleshooting

### Si aún hay 302:

1. Verificar que Nginx esté usando la nueva configuración:
   ```bash
   nginx -t  # Verificar sintaxis
   nginx -s reload  # Recargar configuración
   ```

2. Verificar que el backend no esté redirigiendo:
   ```bash
   curl -v https://adminparquear-z6mc5.ondigitalocean.app/auth/login
   ```

3. Revisar los headers de respuesta:
   ```bash
   curl -I http://admin.alparquear.com/mt-api/auth/login
   ```

### Si hay errores de CORS:

Asegurarse de que el backend esté configurado para aceptar peticiones desde `admin.alparquear.com`.
