# 🐳 Guía de Dockerización - LOGIFARMA PQR

Esta guía te ayudará a ejecutar el proyecto LOGIFARMA PQR usando Docker y Docker Compose.

## 📋 Requisitos Previos

- **Docker**: versión 20.10 o superior
- **Docker Compose**: versión 2.0 o superior

Verifica que tienes Docker instalado:
```bash
docker --version
docker-compose --version
```

## 🏗️ Arquitectura de Contenedores

El proyecto está dividido en 3 servicios:

1. **db**: PostgreSQL 15 (Base de datos)
2. **backend**: FastAPI + Python 3.11 (API REST)
3. **frontend**: React + Nginx (Interfaz web)

## 🚀 Inicio Rápido

### 1. Clonar y configurar variables de entorno

```bash
# Copia el archivo de ejemplo
cp .env.example .env

# Edita las variables si es necesario (opcional para desarrollo)
```

### 2. Construir y levantar los servicios

```bash
# Construir imágenes y levantar todos los servicios
docker-compose up --build

# O en modo detached (segundo plano)
docker-compose up -d --build
```

### 3. Inicializar la base de datos

**Primera vez solamente** - Crear las tablas y datos iniciales:

```bash
# Ejecutar script de inicialización dentro del contenedor backend
docker-compose exec backend python init_db.py
```

### 4. Acceder a la aplicación

- **Frontend**: http://localhost:3002
- **Backend API**: http://localhost:8001
- **Documentación API**: http://localhost:8001/docs (Swagger)
- **Base de datos**: localhost:5433

### Credenciales por defecto

Después de ejecutar `init_db.py`:
- **Admin**: `admin` / `admin123`
- **Agente**: `jagente` / `agente123`

## 📦 Comandos Útiles

### Gestión de contenedores

```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db

# Detener los servicios
docker-compose stop

# Detener y eliminar contenedores
docker-compose down

# Detener y eliminar contenedores + volúmenes (CUIDADO: borra la BD)
docker-compose down -v

# Reiniciar un servicio específico
docker-compose restart backend
```

### Reconstruir imágenes

```bash
# Reconstruir un servicio específico
docker-compose build backend
docker-compose build frontend

# Reconstruir sin cache
docker-compose build --no-cache
```

### Ejecutar comandos dentro de contenedores

```bash
# Abrir shell en el backend
docker-compose exec backend /bin/bash

# Abrir shell en el frontend
docker-compose exec frontend /bin/sh

# Ejecutar comandos de Python en el backend
docker-compose exec backend python -c "print('Hola desde Docker')"

# Acceder a PostgreSQL
docker-compose exec db psql -U postgres -d logifarma_pqr
```

### Migraciones de base de datos

```bash
# Si usas Alembic para migraciones
docker-compose exec backend alembic upgrade head
docker-compose exec backend alembic revision --autogenerate -m "descripción"
```

## 🔧 Desarrollo

### Modo desarrollo con hot-reload

El `docker-compose.yml` actual está configurado con volúmenes para que los cambios en el código se reflejen automáticamente:

```yaml
volumes:
  - ./backend:/app  # Backend con hot-reload
```

Para el frontend, si quieres desarrollo con hot-reload (en lugar de build de producción), modifica el Dockerfile del frontend:

```dockerfile
# Dockerfile.dev
FROM node:20-alpine
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install
COPY . .
EXPOSE 3000
CMD ["yarn", "start"]
```

Y actualiza docker-compose.yml:

```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile.dev
  volumes:
    - ./frontend:/app
    - /app/node_modules
  ports:
    - "3002:3000"
```

## 🛠️ Troubleshooting

### El backend no se conecta a la base de datos

```bash
# Verificar que la BD está corriendo
docker-compose ps

# Verificar logs de la base de datos
docker-compose logs db

# Reiniciar la base de datos
docker-compose restart db
```

### Puerto ya en uso

Si tienes servicios corriendo localmente en los puertos 3002, 8001 o 5433:

```bash
# Detener servicios locales o cambiar puertos en docker-compose.yml
ports:
  - "3003:80"  # Cambiar puerto del host
```

### Limpiar todo y empezar de nuevo

```bash
# CUIDADO: Esto eliminará TODOS los datos
docker-compose down -v
docker system prune -a
docker-compose up --build
docker-compose exec backend python init_db.py
```

### Ver el estado de los contenedores

```bash
# Lista de contenedores activos
docker-compose ps

# Uso de recursos
docker stats

# Inspeccionar un contenedor
docker-compose exec backend env  # Ver variables de entorno
```

## 🔒 Seguridad en Producción

**IMPORTANTE**: Antes de desplegar a producción:

1. Cambia el `SECRET_KEY` en las variables de entorno
2. Usa contraseñas seguras para PostgreSQL
3. Configura CORS con dominios específicos (no usar `*`)
4. Usa HTTPS con un reverse proxy (nginx, traefik, etc.)
5. Configura backups de la base de datos
6. Revisa los logs y configura monitoreo

Ejemplo de docker-compose para producción:

```yaml
backend:
  environment:
    SECRET_KEY: ${SECRET_KEY}  # Desde .env
    CORS_ORIGINS: https://midominio.com
```

## 📊 Monitoreo

### Ver recursos utilizados

```bash
docker stats logifarma_backend logifarma_frontend logifarma_db
```

### Health checks

Los servicios tienen health checks configurados:

```bash
# Ver estado de salud
docker-compose ps

# El backend tiene un healthcheck en /
curl http://localhost:8001/
```

## 🗄️ Backup de Base de Datos

```bash
# Crear backup
docker-compose exec db pg_dump -U postgres logifarma_pqr > backup.sql

# Restaurar backup
docker-compose exec -T db psql -U postgres logifarma_pqr < backup.sql
```

## 📝 Notas Adicionales

- Los volúmenes de PostgreSQL persisten los datos entre reinicios
- El frontend se sirve con Nginx en producción para mejor rendimiento
- El backend usa Uvicorn con auto-reload en desarrollo
- Todos los servicios están en una red privada `logifarma_network`

## 🆘 Soporte

Si encuentras problemas:

1. Revisa los logs: `docker-compose logs -f`
2. Verifica las variables de entorno en `.env`
3. Asegúrate de que los puertos no estén en uso
4. Intenta reconstruir: `docker-compose up --build`

---

Desarrollado con ❤️ para LOGIFARMA
