FROM node:20-alpine AS runner

WORKDIR /app

# Instalar dependencias necesarias del sistema (OpenSSL y SQLite)
RUN apk add --no-cache openssl libc6-compat sqlite

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copiar manifiesto de dependencias y esquemas de Prisma
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Instalar todas las dependencias incluyendo devDependencies para poder compilar con Turbopack y Tailwind
RUN npm ci --include=dev

# Copiar el resto del código fuente del proyecto
COPY . .

# Generar cliente de Prisma
RUN npx prisma generate

# Compilar aplicación Next.js
RUN npm run build

# Permisos para el script de inicio
RUN chmod +x docker-entrypoint.sh

# Exponer el puerto del monitor
EXPOSE 3000

# Punto de entrada
ENTRYPOINT ["/app/docker-entrypoint.sh"]
