@echo off
echo ================================
echo LOGIFARMA PQR - Inicio con Docker
echo ================================
echo.

REM Verificar si Docker está instalado
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker no está instalado o no está en el PATH
    echo Por favor instala Docker Desktop desde https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

REM Verificar si existe archivo .env
if not exist .env (
    echo Creando archivo .env desde .env.example...
    copy .env.example .env
    echo.
    echo IMPORTANTE: Revisa el archivo .env y ajusta las variables si es necesario
    echo.
    pause
)

echo Deteniendo contenedores existentes...
docker-compose down

echo.
echo Construyendo imagenes...
docker-compose build

echo.
echo Levantando servicios...
docker-compose up -d

echo.
echo Esperando que los servicios inicien...
timeout /t 10 /nobreak >nul

echo.
echo Verificando si la base de datos necesita inicializacion...
docker-compose exec -T db psql -U postgres -d logifarma_pqr -c "SELECT 1 FROM usuarios LIMIT 1;" >nul 2>&1
if errorlevel 1 (
    echo.
    echo Inicializando base de datos...
    docker-compose exec backend python init_db.py
    echo.
    echo Base de datos inicializada con usuarios por defecto:
    echo   - Admin: admin / admin123
    echo   - Agente: jagente / agente123
)

echo.
echo ================================
echo Servicios iniciados correctamente!
echo ================================
echo.
echo Frontend:  http://localhost:3002
echo Backend:   http://localhost:8001
echo API Docs:  http://localhost:8001/docs
echo.
echo Para ver los logs: docker-compose logs -f
echo Para detener:     docker-compose down
echo.
pause
