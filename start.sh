#!/bin/bash

echo "================================"
echo "LOGIFARMA PQR - Inicio con Docker"
echo "================================"
echo ""

# Verificar si Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker no está instalado"
    echo "Por favor instala Docker desde https://docs.docker.com/get-docker/"
    exit 1
fi

# Verificar si Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo "ERROR: Docker Compose no está instalado"
    echo "Por favor instala Docker Compose desde https://docs.docker.com/compose/install/"
    exit 1
fi

# Verificar si existe archivo .env
if [ ! -f .env ]; then
    echo "Creando archivo .env desde .env.example..."
    cp .env.example .env
    echo ""
    echo "IMPORTANTE: Revisa el archivo .env y ajusta las variables si es necesario"
    echo ""
    read -p "Presiona Enter para continuar..."
fi

echo "Deteniendo contenedores existentes..."
docker-compose down

echo ""
echo "Construyendo imágenes..."
docker-compose build

echo ""
echo "Levantando servicios..."
docker-compose up -d

echo ""
echo "Esperando que los servicios inicien..."
sleep 10

echo ""
echo "Verificando si la base de datos necesita inicialización..."
if ! docker-compose exec -T db psql -U postgres -d logifarma_pqr -c "SELECT 1 FROM usuarios LIMIT 1;" &> /dev/null; then
    echo ""
    echo "Inicializando base de datos..."
    docker-compose exec backend python init_db.py
    echo ""
    echo "Base de datos inicializada con usuarios por defecto:"
    echo "  - Admin: admin / admin123"
    echo "  - Agente: jagente / agente123"
fi

echo ""
echo "================================"
echo "Servicios iniciados correctamente!"
echo "================================"
echo ""
echo "Frontend:  http://localhost:3002"
echo "Backend:   http://localhost:8001"
echo "API Docs:  http://localhost:8001/docs"
echo ""
echo "Para ver los logs: docker-compose logs -f"
echo "Para detener:     docker-compose down"
echo ""
