# Guía de Despliegue Angular 20 en Cloud Run

Esta guía explica cómo desplegar una aplicación Angular 20 en Google Cloud Run usando Docker.

## Opciones de Despliegue

### Opción 1: Aplicación Estática con Nginx (Recomendado) ⭐

**Ventajas:**
- ✅ Más rápido y eficiente
- ✅ Menor consumo de recursos
- ✅ Mejor para SEO con prerendering
- ✅ Más económico en Cloud Run
- ✅ Imagen Docker más pequeña

**Cuándo usar:**
- Aplicaciones que no requieren SSR dinámico
- Cuando el contenido puede ser prerenderizado
- Para maximizar rendimiento y minimizar costos

**Archivo:** `Dockerfile` (por defecto)

**Estructura de salida:**
```
dist/t-parking/
  └── browser/     → Archivos estáticos (JS, CSS, HTML)
```

### Opción 2: Server-Side Rendering (SSR) con Node.js

**Ventajas:**
- ✅ Renderizado dinámico en el servidor
- ✅ Mejor para contenido personalizado por usuario
- ✅ SEO mejorado con contenido dinámico

**Desventajas:**
- ❌ Mayor consumo de recursos
- ❌ Más costoso en Cloud Run
- ❌ Imagen Docker más grande

**Cuándo usar:**
- Cuando necesitas renderizar contenido dinámico en el servidor
- Para contenido personalizado por usuario
- Cuando el prerendering no es suficiente

**Archivo:** `Dockerfile.ssr`

**Estructura de salida:**
```
dist/t-parking/
  ├── browser/     → Archivos estáticos
  └── server/      → Código del servidor Node.js
```

## Configuración Actual

### Dockerfile (Estático - Por Defecto)

```dockerfile
# Build stage
FROM node:20-alpine AS build
# ... compila la aplicación

# Runtime stage
FROM nginx:alpine
# ... sirve archivos estáticos
```

### Dockerfile.ssr (SSR)

```dockerfile
# Build stage
FROM node:20-alpine AS build
# ... compila la aplicación

# Runtime stage
FROM node:20-alpine AS runtime
# ... ejecuta servidor Node.js
```

## Despliegue

### Opción 1: Usando Cloud Build (Recomendado)

El `cloudbuild.yaml` está configurado para usar el `Dockerfile` por defecto (estático):

```bash
gcloud builds submit --config=cloudbuild.yaml
```

### Opción 2: Cambiar a SSR

Si quieres usar SSR, modifica `cloudbuild.yaml`:

```yaml
- name: 'gcr.io/cloud-builders/docker'
  args:
    - 'build'
    - '-f'
    - 'Dockerfile.ssr'  # Cambiar aquí
    - '-t'
    - 'us-central1-docker.pkg.dev/$PROJECT_ID/parking-services-repo/parking-frontend:$SHORT_SHA'
    # ...
```

Y actualiza la configuración de Cloud Run:

```yaml
- '--port'
- '8080'  # Cambiar de 80 a 8080 para Node.js
- '--memory'
- '1Gi'   # Aumentar memoria para SSR
```

### Opción 3: Despliegue Manual

**Para aplicación estática:**
```bash
docker build -t parking-frontend .
docker tag parking-frontend us-central1-docker.pkg.dev/PROJECT_ID/parking-services-repo/parking-frontend:latest
docker push us-central1-docker.pkg.dev/PROJECT_ID/parking-services-repo/parking-frontend:latest

gcloud run deploy parking-frontend \
  --image us-central1-docker.pkg.dev/PROJECT_ID/parking-services-repo/parking-frontend:latest \
  --region us-central1 \
  --platform managed \
  --port 80 \
  --allow-unauthenticated
```

**Para SSR:**
```bash
docker build -f Dockerfile.ssr -t parking-frontend-ssr .
docker tag parking-frontend-ssr us-central1-docker.pkg.dev/PROJECT_ID/parking-services-repo/parking-frontend-ssr:latest
docker push us-central1-docker.pkg.dev/PROJECT_ID/parking-services-repo/parking-frontend-ssr:latest

gcloud run deploy parking-frontend-ssr \
  --image us-central1-docker.pkg.dev/PROJECT_ID/parking-services-repo/parking-frontend-ssr:latest \
  --region us-central1 \
  --platform managed \
  --port 8080 \
  --memory 1Gi \
  --allow-unauthenticated
```

## Optimizaciones Implementadas

### 1. Multi-stage Build
- Reduce el tamaño de la imagen final
- Separa el entorno de build del runtime

### 2. Cache de Dependencias
- `package*.json` se copia primero
- Las dependencias se cachean si no cambian
- Acelera builds subsecuentes

### 3. Nginx Optimizado
- Compresión Gzip habilitada
- Headers de seguridad configurados
- Cache para assets estáticos
- Soporte para Angular routing (SPA)

### 4. Configuración de Angular 20
- Usa el nuevo builder `@angular/build:application`
- Soporte para SSR cuando sea necesario
- Optimizaciones de producción habilitadas

## Variables de Entorno

Para inyectar la URL del backend en tiempo de ejecución, puedes usar variables de entorno en `cloudbuild.yaml`:

```yaml
- '--set-env-vars'
- 'API_URL=${_BACKEND_URL}'
```

Y en `substitutions`:
```yaml
substitutions:
  _BACKEND_URL: 'https://parking-backend-520107883510.us-central1.run.app'
```

## Troubleshooting

### Problema: Página en blanco o error 404
**Solución:** Verifica que los archivos se copien correctamente desde `dist/t-parking/browser`

### Problema: Rutas de Angular no funcionan
**Solución:** Verifica que `nginx.conf` tenga `try_files $uri $uri/ /index.html;`

### Problema: Assets no se cargan
**Solución:** Verifica que la ruta base en `angular.json` y `index.html` sea correcta

## Referencias

- [Angular Deployment](https://angular.io/guide/deployment)
- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Docker Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
