#!/bin/sh
# Script para copiar archivos de Angular al directorio de Nginx

# Buscar index.html en el directorio dist
INDEX_FILE=$(find /app/dist -name "index.html" -type f | head -1)

if [ -z "$INDEX_FILE" ]; then
    echo "ERROR: index.html not found in /app/dist"
    echo "Dist structure:"
    find /app/dist -type f | head -20
    exit 1
fi

# Obtener el directorio que contiene index.html
DIST_DIR=$(dirname "$INDEX_FILE")
echo "Found index.html at: $INDEX_FILE"
echo "Copying from: $DIST_DIR"

# Copiar todos los archivos al directorio de Nginx
cp -r "$DIST_DIR"/* /usr/share/nginx/html/ 2>/dev/null || cp -r "$DIST_DIR"/. /usr/share/nginx/html/

# Verificar que se copió correctamente
if [ ! -f /usr/share/nginx/html/index.html ]; then
    echo "ERROR: Failed to copy files to /usr/share/nginx/html"
    exit 1
fi

echo "Files copied successfully"
ls -la /usr/share/nginx/html/ | head -10
