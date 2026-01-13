# Multi-stage build para optimizar el tamaño de la imagen
FROM node:20-alpine AS builder

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Construir la aplicación para producción con SSR
RUN npm run build

# Stage 2: Imagen de producción con Node.js (soporta SSR y contenido dinámico)
FROM node:20-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Copiar package.json para instalar solo dependencias de producción
COPY --from=builder /app/package*.json /app/

# Instalar solo dependencias de producción (incluye http-proxy-middleware)
RUN npm ci --only=production && npm cache clean --force

# Copiar archivos construidos desde el stage anterior
COPY --from=builder /app/dist/t-parking /app/dist/t-parking

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Cambiar ownership de los archivos
RUN chown -R nodejs:nodejs /app

# Cambiar a usuario no-root
USER nodejs

# Exponer puerto (por defecto 4000, configurable con variable de entorno)
EXPOSE 4000

# Variables de entorno
ENV PORT=4000
ENV NODE_ENV=production
ENV API_URL=http://10.116.0.5:9000

# Comando para iniciar el servidor Node.js con SSR
CMD ["node", "dist/t-parking/server/server.mjs"]
