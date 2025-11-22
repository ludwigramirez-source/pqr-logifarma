# Frontend Dockerfile - React Multi-Stage Build

# Etapa 1: Build
FROM node:20-alpine AS builder

# Argumento para la URL del backend
ARG REACT_APP_BACKEND_URL=http://localhost:8001

WORKDIR /app

# Copiar package.json
COPY package.json ./

# Instalar dependencias (generará yarn.lock si no existe)
RUN yarn install --network-timeout 100000

# Copiar el código fuente
COPY . .

# Crear archivo .env con la variable de entorno
RUN echo "REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}" > .env

# Build de producción
RUN yarn build

# Etapa 2: Producción con Nginx
FROM nginx:alpine

# Copiar archivos build desde la etapa anterior
COPY --from=builder /app/build /usr/share/nginx/html

# Copiar configuración de nginx personalizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto 80
EXPOSE 80

# Nginx se ejecuta automáticamente en foreground
CMD ["nginx", "-g", "daemon off;"]
