# Monitor de Servicios Web (Next.js + Prisma ORM + MongoDB + PWA + shadcn/ui)

Sistema profesional de monitoreo de disponibilidad, conectividad y latencia para páginas web, APIs y microservicios. Desarrollado con **Next.js (App Router)**, interfaz moderna con **shadcn/ui**, **Prisma ORM sobre MongoDB persistente**, preparado como **PWA (Progressive Web App)** con soporte de **Notificaciones Web Push (VAPID)** en tiempo real, **sistema de autenticación con control de roles** y despliegue automatizado con **Docker Compose** incluyendo contenedor de **MongoDB 7.0**.

---

## Características Principales

- **Docker Compose con MongoDB Incluido:** Despliegue completo con un solo comando. Incluye el servicio web Next.js y el servicio de MongoDB 7.0 configurado con réplica y salud comprobada automáticamente.
- **Persistencia Completa de Datos:** Volumen de Docker `mongo_data` mapeado a `/data/db` para garantizar que todos los usuarios, servicios monitoreados y logs históricos persistan ante reinicios, paradas o actualizaciones del contenedor.
- **Base de Datos con Prisma ORM:** Acceso tipado de alto rendimiento y modelos independientes en la base de datos `monitor-db`.
- **Seguridad y Control de Accesos:** Middleware de autenticación con JWT (cookies `HttpOnly`), contraseñas cifradas con `bcryptjs` y roles jerárquicos (`admin`, `operador`, `observador`).
- **Dashboard Shadcn/ui:** Interfaz responsiva adaptada a móviles (desde 3.5 pulgadas en adelante), tema oscuro elegante, tarjetas de estado en tiempo real, latencia en ms y métricas de uptime.
- **Detección Automática de Caídas:** Comprobaciones periódicas de páginas web (códigos HTTP 200, 4xx, 5xx, tiempos de espera/timeouts, fallos DNS).
- **Notificaciones Web Push:** Alertas instantáneas al navegador y dispositivos móviles cuando un sitio se cae o se recupera, incluso con la pestaña cerrada.
- **PWA Lista para Instalar:** Funciona como aplicación independiente en Escritorio (Windows, Mac, Linux) y Móvil (Android, iOS) con manifest, Service Worker e iconos generados.
- **Demonio en Segundo Plano:** Monitoreo continuo 24/7 sin necesidad de tener el navegador abierto.

---

## Despliegue con Docker Compose (Recomendado)

El proyecto incluye MongoDB y el servidor web listos para correr conjuntamente:

### 1. Iniciar los Servicios
```bash
docker compose up -d --build
```
Esto iniciará:
1. **`monitor_mongodb`**: Servidor MongoDB 7.0 con volumen persistente en puerto `27017`.
2. **`monitor_servicios_app`**: Aplicación Next.js compilada + demonio de monitoreo 24/7 en puerto `3000`.

### 2. Verificar el Estado
```bash
docker compose ps
```

### 3. Ver Logs en Tiempo Real
```bash
# Ver logs de todos los servicios
docker compose logs -f

# Ver logs solo del monitor
docker compose logs -f monitor-servicios

# Ver logs solo de MongoDB
docker compose logs -f mongodb
```

### 4. Acceder al Panel
Abre en tu navegador:
[http://localhost:3000](http://localhost:3000)

### 5. Detener los Servicios
```bash
docker compose down
```
*(Tus datos seguirán guardados en el volumen `mongo_data`).*

---

## Credenciales Iniciales de Administrador

Al iniciar por primera vez, el sistema crea automáticamente el primer usuario administrador en MongoDB:
- **Correo:** `admin@monitor.local`
- **Contraseña:** `admin123`

*(Puedes cambiar la contraseña o crear nuevos operadores desde el botón **"Usuarios"** en la barra superior).*

---

## Conexión Externa a MongoDB

El contenedor de MongoDB expone el puerto estándar `27017`. Puedes conectarte desde tu máquina host (por ejemplo, con MongoDB Compass o scripts locales) mediante la URI:

```bash
mongodb://localhost:27017/monitor-db?directConnection=true
```

---

## Ejecución Local sin Docker (Opcional)

Si prefieres ejecutar el proyecto localmente con Node.js y conectar al MongoDB de Docker:

### 1. Iniciar solo MongoDB en Docker
```bash
docker compose up -d mongodb
```

### 2. Instalar Dependencias y Generar Prisma
```bash
npm install
npx prisma generate
```

### 3. Sincronizar Índices en MongoDB
```bash
npx prisma db push
```

### 4. Iniciar Servidor de Desarrollo
```bash
npm run dev
```

---

## Estructura del Proyecto

```
MONITOR_DE_SERVICIOS/
├── Dockerfile                # Construcción optimizada para producción (Node 20 Alpine)
├── docker-compose.yml        # Orquestación: mongodb (con volumen persistente) + web app
├── docker-entrypoint.sh      # Arranque: sincronización Prisma + demonio 24/7 + Next.js
├── prisma/
│   └── schema.prisma         # Definición del esquema Prisma con provider MongoDB
├── public/
│   ├── icons/                # Iconos PWA
│   ├── manifest.json         # Manifiesto PWA para instalación
│   └── sw.js                 # Service Worker para Notificaciones Web Push
├── scripts/
│   └── monitor-daemon.mjs    # Script para monitoreo continuo 24/7
├── src/
│   ├── app/                  # Rutas App Router (Dashboard, Login, APIs)
│   ├── components/           # Componentes UI responsivos (shadcn/ui)
│   ├── hooks/                # Hooks Web Push y Service Worker
│   ├── lib/                  # Auth, Prisma singleton, checker HTTP y Web Push
│   └── middleware.ts         # Middleware para protección de rutas privadas
├── .env                      # Variables de entorno
├── .env.local                # Variables de entorno locales
└── package.json              # Dependencias y scripts
```
