# Redirección del Frontend en Producción

## Arquitectura de Producción

```
Cliente (Navegador)
    ↓
Nginx (Puerto 80/443) - admin.alparquear.com
    ↓
    ├─→ /mt-api/* → Proxy a https://adminparquear-z6mc5.ondigitalocean.app
    │
    └─→ /* (todas las demás rutas) → Node.js Express (Puerto 4000)
            ↓
        Angular SSR + Archivos Estáticos
```

## Flujo de Redirección

### 1. Peticiones a la API (`/mt-api/*`)

Cuando el frontend hace una petición a `/mt-api/*`:

1. **Cliente** → Envía petición a `https://admin.alparquear.com/mt-api/auth/login`
2. **Nginx** → Detecta el patrón `/mt-api` y redirige usando `proxy_pass`
3. **Backend** → Recibe la petición en `https://adminparquear-z6mc5.ondigitalocean.app/auth/login`
4. **Respuesta** → Nginx devuelve la respuesta al cliente

**Configuración en `nginx.conf`:**
```nginx
location /mt-api {
    proxy_pass https://adminparquear-z6mc5.ondigitalocean.app;
    # ... headers y configuración
}
```

### 2. Peticiones al Frontend (todas las demás rutas)

Cuando el cliente accede a cualquier otra ruta (`/`, `/countries`, `/clients`, etc.):

1. **Cliente** → Envía petición a `https://admin.alparquear.com/countries`
2. **Nginx** → No coincide con `/mt-api`, pasa la petición a Node.js
3. **Node.js Express** → 
   - Primero intenta servir archivos estáticos desde `/browser`
   - Si no encuentra, ejecuta Angular SSR para renderizar la página
4. **Respuesta** → HTML renderizado con SSR devuelto al cliente

**Configuración en `nginx.conf`:**
```nginx
location / {
    try_files $uri $uri/ /index.html;
    # En producción, esto se maneja por Node.js con SSR
}
```

## Configuración Actual

### Nginx (`nginx.conf`)

```nginx
server {
    listen 80;
    server_name admin.alparquear.com;
    
    # Proxy para API
    location /mt-api {
        proxy_pass https://adminparquear-z6mc5.ondigitalocean.app;
        # ... configuración de headers
    }
    
    # Frontend (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Node.js (`src/server.ts`)

```typescript
// Sirve archivos estáticos
app.use(express.static(browserDistFolder));

// Maneja SSR para todas las demás rutas
app.use((req, res, next) => {
  angularApp.handle(req).then(...);
});
```

## Configuración Recomendada para Producción

### Opción 1: Nginx como Reverse Proxy Completo (Recomendado)

Si Nginx está en un contenedor o servidor separado:

```nginx
server {
    listen 80;
    server_name admin.alparquear.com;
    
    # Proxy para API
    location /mt-api {
        proxy_pass https://adminparquear-z6mc5.ondigitalocean.app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Proxy para Frontend (Node.js con SSR)
    location / {
        proxy_pass http://localhost:4000;  # O la IP del contenedor Node.js
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Opción 2: Nginx solo para API, Node.js expone directamente

Si Node.js está expuesto directamente al puerto 80/443:

- Nginx maneja solo `/mt-api` → Backend
- Node.js maneja todo lo demás directamente en puerto 80/443

## Variables de Entorno en el Frontend

El frontend usa `environment.apiAuthJwt` que está configurado como `/mt-api`:

```typescript
// src/environments/environment.prod.ts
export const environment = {
    apiAuthJwt: '/mt-api'  // Nginx redirige esto al backend
};
```

**Importante**: El frontend siempre usa rutas relativas (`/mt-api`), no URLs absolutas. Esto permite que Nginx haga el proxy correctamente.

## Ejemplo de Flujo Completo

### Usuario accede a `/countries`:

1. Cliente: `GET https://admin.alparquear.com/countries`
2. Nginx: No coincide con `/mt-api`, pasa a Node.js
3. Node.js: Renderiza la página con SSR
4. Cliente: Recibe HTML renderizado

### Frontend hace petición API:

1. Frontend: `GET /mt-api/countries/pageable`
2. Nginx: Detecta `/mt-api`, redirige a `https://adminparquear-z6mc5.ondigitalocean.app/countries/pageable`
3. Backend: Procesa la petición
4. Nginx: Devuelve respuesta al frontend
5. Frontend: Actualiza la UI

## Troubleshooting

### Las peticiones API no funcionan

1. Verificar que Nginx esté configurado correctamente
2. Verificar que el backend esté accesible desde Nginx
3. Revisar logs de Nginx: `tail -f /var/log/nginx/error.log`

### El frontend no carga

1. Verificar que Node.js esté corriendo en el puerto 4000
2. Verificar que los archivos estáticos estén en `/browser`
3. Revisar logs de Node.js

### CORS Errors

Si hay errores de CORS, asegúrate de que Nginx esté configurando los headers correctos:
```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```
