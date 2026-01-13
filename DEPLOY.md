# Guía de Deploy - T-Parking

Esta guía explica cómo desplegar la aplicación T-Parking usando Docker con Node.js y SSR.

## Requisitos Previos

- Docker instalado (versión 20.10 o superior)
- Docker Compose instalado (versión 2.0 o superior)
- Acceso a la red donde se encuentra el backend en `10.116.0.5:9000`

## Estructura de Deploy

### Archivos de Configuración

- `Dockerfile`: Define la construcción de la imagen Docker con Node.js (soporta SSR y contenido dinámico)
- `docker-compose.yml`: Orquesta el despliegue del contenedor
- `src/server.ts`: Servidor Express con SSR y proxy para API
- `.dockerignore`: Archivos excluidos del contexto de Docker

### ¿Por qué Node.js en lugar de Nginx?

- **Nginx**: Solo sirve archivos estáticos, no puede ejecutar JavaScript del lado del servidor
- **Node.js con Express**: Soporta Server-Side Rendering (SSR) y contenido dinámico
- **SSR**: Mejora el SEO, tiempos de carga inicial y experiencia del usuario

### Configuración de Environment

Los archivos de environment están en `src/environments/`:
- `environment.ts`: Configuración de desarrollo
- `environment.prod.ts`: Configuración de producción

## Construcción y Deploy

### Opción 1: Usando Docker Compose (Recomendado)

```bash
# Construir y levantar el contenedor
docker-compose up -d --build

# Ver logs
docker-compose logs -f

# Detener el contenedor
docker-compose down
```

### Opción 2: Usando Docker directamente

```bash
# Construir la imagen
docker build -t t-parking:latest .

# Ejecutar el contenedor
docker run -d -p 4000:4000 \
  -e API_URL=http://10.116.0.5:9000 \
  -e NODE_ENV=production \
  --name t-parking-app \
  t-parking:latest

# Ver logs
docker logs -f t-parking-app

# Detener el contenedor
docker stop t-parking-app
docker rm t-parking-app
```

## Configuración del Proxy

El proxy está configurado para redirigir las peticiones de `/mt-api` a `http://10.116.0.5:9000`.

### Desarrollo
- Archivo: `proxy.conf.json`
- Target: `http://localhost:9000` (desarrollo) o `http://10.116.0.5:9000` (producción)

### Producción
- Archivo: `src/server.ts` (Express con http-proxy-middleware)
- Location: `/mt-api` → `http://10.116.0.5:9000` (configurable con variable `API_URL`)

## Verificación

Una vez desplegado, la aplicación estará disponible en:
- Frontend con SSR: `http://localhost:4000` (puerto 4000)
- API Proxy: `http://localhost:4000/mt-api` → `http://10.116.0.5:9000`

### Variables de Entorno

Puedes configurar las siguientes variables de entorno:
- `PORT`: Puerto donde escucha el servidor (default: 4000)
- `API_URL`: URL del backend API (default: http://10.116.0.5:9000)
- `NODE_ENV`: Entorno de ejecución (production/development)

## Troubleshooting

### El contenedor no inicia
```bash
# Ver logs del contenedor
docker logs t-parking-app

# Verificar que el puerto 80 no esté en uso
netstat -an | grep 80
```

### Error de conexión al backend
- Verificar que el backend esté accesible desde el contenedor: `docker exec -it t-parking-app ping 10.116.0.5`
- Verificar la variable de entorno `API_URL` en el contenedor: `docker exec -it t-parking-app env | grep API_URL`

### Cambiar la IP del backend
Editar la variable de entorno `API_URL` en `docker-compose.yml` o pasarla al ejecutar el contenedor:
```bash
docker run -d -p 4000:4000 -e API_URL=http://nueva-ip:9000 t-parking:latest
```

## Actualización

Para actualizar la aplicación:

```bash
# Detener el contenedor actual
docker-compose down

# Reconstruir con los nuevos cambios
docker-compose up -d --build
```
