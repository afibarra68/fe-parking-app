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

# Imagen final con Nginx
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Copiar archivos compilados
COPY --from=build /app/dist/t-parking/browser .

# Copiar configuración de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

