# Dockerfile optimizado para Angular 20 en Cloud Run
# Opción 1: Servir como aplicación estática con Nginx (recomendado)

# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app

# Copiar archivos de configuración primero para cachear dependencias
COPY package*.json ./

# Instalar dependencias (npm ci es más rápido y determinístico)
RUN npm ci --only=production=false

# Copiar código fuente
COPY . .

# Compilar la aplicación para producción
# Con Angular 20, esto genera dist/t-parking/browser y dist/t-parking/server
RUN npm run build -- --configuration production

# Stage 2: Runtime con Nginx
FROM nginx:alpine

# Copiar archivos compilados del cliente (browser)
# Angular 20 genera los archivos estáticos en dist/t-parking/browser
COPY --from=build /app/dist/t-parking/browser /usr/share/nginx/html

# Copiar configuración de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto 80
EXPOSE 80

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
