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

# Copiar package.json y package-lock.json para instalar dependencias
COPY --from=builder /app/package*.json /app/

# Verificar que package-lock.json existe antes de instalar
RUN if [ ! -f package-lock.json ]; then \
      echo "⚠️  package-lock.json no encontrado, generando uno nuevo..." && \
      npm install --package-lock-only --only=production; \
    fi

# Instalar solo dependencias de producción necesarias para el servidor
# Esto incluye: express, http-proxy-middleware y todas las dependencias de Angular SSR
RUN npm ci --only=production && \
    npm cache clean --force

# Verificar que las dependencias críticas estén instaladas
RUN echo "Verificando dependencias del servidor..." && \
    npm list express http-proxy-middleware @angular/ssr express 2>/dev/null || echo "Algunas dependencias pueden estar en el bundle" && \
    # Verificar que los módulos pueden ser requeridos
    node -e "try { require('express'); require('http-proxy-middleware'); console.log('✅ Dependencias del servidor verificadas correctamente'); } catch(e) { console.error('❌ Error:', e.message); process.exit(1); }"

# Copiar archivos construidos desde el stage anterior
COPY --from=builder /app/dist/t-parking /app/dist/t-parking

# Verificar que el servidor compilado existe y es ejecutable
RUN test -f dist/t-parking/server/server.mjs && \
    echo "✅ Servidor compilado encontrado" || \
    (echo "❌ Error: Servidor compilado no encontrado" && exit 1)

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
