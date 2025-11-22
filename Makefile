.PHONY: help build up down restart logs clean init-db backup restore

help:
	@echo "================================"
	@echo "LOGIFARMA PQR - Comandos Docker"
	@echo "================================"
	@echo ""
	@echo "Comandos disponibles:"
	@echo "  make build      - Construir imágenes"
	@echo "  make up         - Levantar servicios"
	@echo "  make down       - Detener servicios"
	@echo "  make restart    - Reiniciar servicios"
	@echo "  make logs       - Ver logs de todos los servicios"
	@echo "  make init-db    - Inicializar base de datos"
	@echo "  make clean      - Limpiar contenedores y volúmenes"
	@echo "  make backup     - Crear backup de la base de datos"
	@echo "  make restore    - Restaurar backup de la base de datos"
	@echo ""

build:
	@echo "Construyendo imágenes..."
	docker-compose build

up:
	@echo "Levantando servicios..."
	docker-compose up -d
	@echo ""
	@echo "Servicios iniciados:"
	@echo "  Frontend:  http://localhost:3002"
	@echo "  Backend:   http://localhost:8001"
	@echo "  API Docs:  http://localhost:8001/docs"

down:
	@echo "Deteniendo servicios..."
	docker-compose down

restart:
	@echo "Reiniciando servicios..."
	docker-compose restart

logs:
	docker-compose logs -f

init-db:
	@echo "Inicializando base de datos..."
	docker-compose exec backend python init_db.py
	@echo ""
	@echo "Usuarios creados:"
	@echo "  - Admin: admin / admin123"
	@echo "  - Agente: jagente / agente123"

clean:
	@echo "ADVERTENCIA: Esto eliminará todos los contenedores, imágenes y volúmenes"
	@read -p "¿Estás seguro? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		docker system prune -af; \
		echo "Limpieza completada"; \
	fi

backup:
	@echo "Creando backup de la base de datos..."
	docker-compose exec db pg_dump -U postgres logifarma_pqr > backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "Backup creado exitosamente"

restore:
	@echo "Restaurando backup..."
	@read -p "Ingresa el nombre del archivo de backup: " backup_file; \
	docker-compose exec -T db psql -U postgres logifarma_pqr < $$backup_file
	@echo "Restauración completada"

# Comandos adicionales útiles
shell-backend:
	docker-compose exec backend /bin/bash

shell-frontend:
	docker-compose exec frontend /bin/sh

shell-db:
	docker-compose exec db psql -U postgres -d logifarma_pqr

stats:
	docker stats logifarma_backend logifarma_frontend logifarma_db
