# Dockerfile para Angular Admin Frontend
FROM node:20-alpine AS build
WORKDIR /app

# Copiar archivos de configuración primero para cachear dependencias
# Esta capa se cachea si package*.json no cambia
COPY package*.json ./

# Instalar dependencias (npm ci es más rápido y determinístico que npm install)
RUN npm ci --only=production=false

# Copiar código fuente (solo se recompila si el código cambia)
COPY . .

# Compilar la aplicación para producción
RUN npm run build -- --configuration production

# Verificar dónde se generaron los archivos (para debugging)
RUN echo "=== Dist structure ===" && \
    find /app/dist -type f -name "*.html" 2>/dev/null | head -10 && \
    echo "=== Full dist listing ===" && \
    ls -laR /app/dist/ | head -50

# Imagen final con Nginx
FROM nginx:alpine

# Copiar el script de copia desde el contexto de build
COPY copy-dist.sh /tmp/copy-dist.sh
RUN chmod +x /tmp/copy-dist.sh

# Copiar todo el directorio dist para que el script pueda buscar
COPY --from=build /app/dist /app/dist

# Ejecutar script para copiar archivos correctamente
RUN /tmp/copy-dist.sh && rm -rf /app/dist /tmp/copy-dist.sh

# Copiar configuración de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

