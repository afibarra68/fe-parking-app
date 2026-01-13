# Configuración de api-flux.alparquear.com

## Resumen

Se ha agregado soporte para `api-flux.alparquear.com` que permite hacer peticiones directamente al backend sin usar el prefijo `/mt-api`.

## Configuración

### 1. Nginx (`nginx.conf`)

Se agregó un nuevo bloque de servidor para `api-flux.alparquear.com`:

```nginx
server {
    listen 80;
    server_name api-flux.alparquear.com;

    location / {
        # Proxy directo sin reescribir URL
        proxy_pass https://adminparquear-z6mc5.ondigitalocean.app;
        # ... configuración de headers y cookies
    }
}
```

**Características:**
- No requiere prefijo `/mt-api`
- Las peticiones van directamente al backend
- Ejemplo: `POST https://api-flux.alparquear.com/auth/login` → `POST https://adminparquear-z6mc5.ondigitalocean.app/auth/login`

### 2. Environment de Producción (`src/environments/environment.prod.ts`)

Configurado para usar `api-flux.alparquear.com` directamente:

```typescript
apiAuthJwt: 'https://api-flux.alparquear.com',
apiUrl: 'https://api-flux.alparquear.com'
```

## Comparación de Configuraciones

### Opción 1: Usando `/mt-api` (proxy interno)

**Environment:**
```typescript
apiAuthJwt: '/mt-api',
apiUrl: '/mt-api'
```

**Flujo:**
```
Angular → POST /mt-api/auth/login
    ↓
Nginx (admin.alparquear.com) → Detecta /mt-api
    ↓
Backend → POST /auth/login (sin /mt-api)
```

**Ventajas:**
- El navegador no conoce la URL real del backend
- Todo pasa por el mismo dominio (sin CORS)
- Cookies se manejan automáticamente

### Opción 2: Usando `api-flux.alparquear.com` (directo)

**Environment:**
```typescript
apiAuthJwt: 'https://api-flux.alparquear.com',
apiUrl: 'https://api-flux.alparquear.com'
```

**Flujo:**
```
Angular → POST https://api-flux.alparquear.com/auth/login
    ↓
Nginx (api-flux.alparquear.com) → Proxy directo
    ↓
Backend → POST /auth/login
```

**Ventajas:**
- No requiere prefijo `/mt-api`
- URL más limpia y directa
- Separación clara entre frontend y API

## Cambiar entre Configuraciones

Para cambiar entre las dos opciones, edita `src/environments/environment.prod.ts`:

**Para usar `/mt-api`:**
```typescript
apiAuthJwt: '/mt-api',
apiUrl: '/mt-api'
```

**Para usar `api-flux.alparquear.com`:**
```typescript
apiAuthJwt: 'https://api-flux.alparquear.com',
apiUrl: 'https://api-flux.alparquear.com'
```

## Requisitos

1. **DNS**: Asegúrate de que `api-flux.alparquear.com` apunte al servidor donde está Nginx
2. **SSL**: Si usas HTTPS, configura certificados SSL para `api-flux.alparquear.com`
3. **Nginx**: Recarga Nginx después de los cambios: `nginx -s reload`

## Ejemplo de Uso

Con la configuración actual (`api-flux.alparquear.com`):

```typescript
// En cualquier servicio
this.http.post('https://api-flux.alparquear.com/auth/login', credentials)
// O usando environment:
this.http.post(`${environment.apiAuthJwt}/auth/login`, credentials)
```

**Resultado:**
- Petición: `POST https://api-flux.alparquear.com/auth/login`
- Nginx redirige a: `POST https://adminparquear-z6mc5.ondigitalocean.app/auth/login`
- Backend procesa la petición normalmente

## Notas

- Ambas configuraciones están disponibles en Nginx
- Solo necesitas cambiar el `environment.prod.ts` para alternar entre ellas
- La configuración de desarrollo (`environment.ts`) sigue usando `/mt-api` con el proxy local
