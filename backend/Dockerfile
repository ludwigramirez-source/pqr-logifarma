# Backend Dockerfile - Python/FastAPI
FROM python:3.11-slim

# Establecer directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema necesarias para PostgreSQL y otras libs
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código de la aplicación
COPY . .

# Copiar certificados SSL
COPY ssl/nginx-selfsigned.crt /app/ssl/nginx-selfsigned.crt
COPY ssl/nginx-selfsigned.key /app/ssl/nginx-selfsigned.key

# Exponer puertos 8000 (HTTP) y 8443 (HTTPS)
EXPOSE 8000 8443

# Comando para ejecutar la aplicación con HTTPS
# Usamos uvicorn con SSL para servir en HTTPS
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8443", "--ssl-keyfile", "/app/ssl/nginx-selfsigned.key", "--ssl-certfile", "/app/ssl/nginx-selfsigned.crt"]
