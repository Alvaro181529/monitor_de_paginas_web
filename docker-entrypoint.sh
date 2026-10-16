#!/bin/sh
set -e

echo "=== INICIANDO MONITOR DE SERVICIOS (Next.js + Prisma + MongoDB) ==="

# Esperar y sincronizar índices en MongoDB con Prisma
echo "Sincronizando índices y colecciones en MongoDB con Prisma..."
RETRY_COUNT=0
MAX_RETRIES=15

until npx prisma db push --skip-generate || [ $RETRY_COUNT -ge $MAX_RETRIES ]; do
  RETRY_COUNT=$((RETRY_COUNT+1))
  echo "Esperando disponibilidad de MongoDB (intento $RETRY_COUNT/$MAX_RETRIES)..."
  sleep 2
done

# Iniciar el demonio de monitoreo continuo en segundo plano
echo "Iniciando demonio de monitoreo 24/7 en segundo plano..."
node scripts/monitor-daemon.mjs &

# Iniciar servidor Next.js
echo "Iniciando servidor web Next.js en puerto 3000..."
exec npm run start -- -H 0.0.0.0 -p 3000
