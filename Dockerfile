# Dockerfile para Angular 20 con Nginx
# Multi-stage build: Build + Runtime
# Optimizado para Digital Ocean

# ============================================
# Stage 1: Build
# ============================================
FROM node:20-alpine AS build
WORKDIR /app

# Build arguments para validación de producción
ARG NODE_ENV=production
ARG PRODUCTION=true
ENV NODE_ENV=$NODE_ENV
ENV PRODUCTION=$PRODUCTION

# Validar que estamos en modo producción
RUN if [ "$PRODUCTION" != "true" ]; then \
        echo "ERROR: PRODUCTION debe ser 'true' para construir imagen de producción"; \
        exit 1; \
    fi && \
    echo "✓ Construyendo en modo producción: NODE_ENV=$NODE_ENV, PRODUCTION=$PRODUCTION"

# Copiar archivos de configuración primero para cachear dependencias
COPY package*.json ./

# Instalar dependencias (npm ci requiere package-lock.json)
# Si package-lock.json existe, usa npm ci (más rápido y determinístico)
# Si no existe, usa npm install
RUN if [ -f package-lock.json ]; then \
        npm ci && \
        echo "✓ Dependencias instaladas con npm ci"; \
    else \
        npm install && \
        echo "✓ Dependencias instaladas con npm install"; \
    fi

# Copiar código fuente
COPY . .

# Validar que nginx.conf existe antes del build
RUN if [ ! -f "nginx.conf" ]; then \
        echo "ERROR: nginx.conf no encontrado"; \
        exit 1; \
    fi && \
    echo "✓ nginx.conf encontrado"

# Compilar la aplicación para producción
# Con Angular 20, esto genera dist/t-parking/browser y dist/t-parking/server
RUN npm run build -- --configuration production

# Validar que el build generó los archivos necesarios
RUN if [ ! -d "/app/dist/t-parking/browser" ]; then \
        echo "ERROR: Directorio dist/t-parking/browser no encontrado después del build"; \
        exit 1; \
    fi && \
    if [ ! -f "/app/dist/t-parking/browser/index.csr.html" ] && [ ! -f "/app/dist/t-parking/browser/index.html" ]; then \
        echo "ERROR: index.html o index.csr.html no encontrado después del build"; \
        ls -la /app/dist/t-parking/browser/; \
        exit 1; \
    fi && \
    echo "✓ Build completado correctamente"

# ============================================
# Stage 2: Runtime con Nginx
# ============================================
FROM nginx:alpine

# Etiquetas de metadatos
LABEL maintainer="WebStore Team"
LABEL description="T-Parking Frontend Application"
LABEL version="0.0.6-SNAPSHOT"

# Copiar archivos compilados del cliente (browser)
# Angular 20 genera los archivos estáticos en dist/t-parking/browser
COPY --from=build /app/dist/t-parking/browser /usr/share/nginx/html

# Renombrar index.csr.html a index.html si existe (Angular 20 genera index.csr.html)
RUN if [ -f /usr/share/nginx/html/index.csr.html ]; then \
        cp /usr/share/nginx/html/index.csr.html /usr/share/nginx/html/index.html && \
        echo "✓ Copied index.csr.html to index.html"; \
    fi

# Verificar que index.html existe
RUN if [ ! -f /usr/share/nginx/html/index.html ]; then \
        echo "ERROR: index.html not found!"; \
        echo "Files in /usr/share/nginx/html:"; \
        ls -la /usr/share/nginx/html/; \
        exit 1; \
    fi && \
    echo "✓ index.html verificado"

# Copiar configuración de Nginx desde el stage de build
COPY --from=build /app/nginx.conf /etc/nginx/conf.d/default.conf

# Validar que la configuración de nginx es válida
RUN nginx -t && \
    echo "✓ Configuración de Nginx válida"

# Crear directorio para logs si no existe
RUN mkdir -p /var/log/nginx && \
    chown -R nginx:nginx /var/log/nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Exponer puerto 80
EXPOSE 80

# Healthcheck para verificar que el contenedor está funcionando
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Iniciar Nginx en modo foreground
CMD ["nginx", "-g", "daemon off;"]
