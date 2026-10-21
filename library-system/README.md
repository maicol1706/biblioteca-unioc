# Sistema Inteligente de Biblioteca Universitaria

Plataforma web para catalogo, circulacion, avisos y el asistente **JARVIS**.
La identidad academica esta desacoplada: hoy es **local**; **Q10** solo se conecta con API oficial.

## Que incluye esta entrega

- Frontend React + Vite + TypeScript
- Backend NestJS + JWT + Argon2id + RBAC
- PostgreSQL 16 + Prisma
- Redis listo para la fase de colas
- Roles: SUPERADMIN, LIBRARIAN, TEACHER, STUDENT
- JARVIS con tools y validacion de permisos (no consulta la BD directo)
- Q10 en modo no configurado (sin endpoints inventados)

## 1. Instalar programas en tu PC

1. Node.js 20 LTS: https://nodejs.org
2. Docker Desktop: https://www.docker.com/products/docker-desktop/
3. Git (opcional) y VS Code (opcional)

Comprueba en una terminal:

```bash
node -v
npm -v
docker --version
docker compose version
```

## 2. Abrir el proyecto

Descomprime o copia la carpeta `library-system` a tu equipo, por ejemplo:

```text
C:\proyectos\library-system
```

o en macOS/Linux:

```text
~/proyectos/library-system
```

Entra a esa carpeta:

```bash
cd library-system
```

## 3. Variables de entorno

```bash
cp .env.example .env
cp .env backend/.env
```

Si ya existe `.env` en esta entrega de desarrollo, puedes usarlo tal cual en local.

## 4. Encender base de datos

```bash
docker compose up -d
docker compose ps
```

Deben aparecer `library_postgres` y `library_redis`.

## 5. Preparar la API

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npx tsx prisma/seed.ts
npm run start:dev
```

La API queda en http://localhost:3001  
Prueba: http://localhost:3001/health

Deja esta terminal abierta.

## 6. Encender la web

Otra terminal:

```bash
cd library-system/frontend
npm install
npm run dev
```

Abre http://localhost:5173

## Cuentas de prueba

Contraseña de todas: `Prueba123!`

| Rol | Correo |
| --- | --- |
| Superadmin | superadmin@universidad.edu |
| Bibliotecaria | bibliotecaria@universidad.edu |
| Docente | docente.redes@universidad.edu |
| Docente | docente.prog@universidad.edu |
| Estudiante | ana.estudiante@universidad.edu |
| Estudiante | luis.estudiante@universidad.edu |
| Estudiante | maria.estudiante@universidad.edu |

## Como demostrar el sistema

1. Entra como `ana.estudiante@universidad.edu`.
2. En Catálogo solicita un libro con ejemplares.
3. Cierra sesión y entra como `bibliotecaria@universidad.edu`.
4. En Solicitudes aprueba el pedido. En Préstamos verás el préstamo activo.
5. Vuelve como Ana y revisa Avisos + JARVIS (`mis prestamos`, `busca calculo`).
6. Entra como `superadmin@universidad.edu` y abre Tablero, Usuarios y Ajustes.
7. En JARVIS, un estudiante que pida `listar usuarios` debe recibir denegación de permiso.

## Rutas principales de la API

- POST `/auth/login`
- GET `/auth/me`
- GET `/books?q=`
- POST `/loan-requests`
- POST `/loan-requests/:id/approve`
- POST `/loans/:id/return`
- POST `/reservations`
- GET `/reports/overview` (requiere `reports.read`)
- POST `/ai/chat`
- GET `/q10/status` (no sincroniza por API)
- GET `/imports/templates/users.csv`
- POST `/imports/users?source=q10` (archivo CSV)
- POST `/imports/catalog` (archivo CSV)

## Lo que no se inventa

Q10 no tiene URL, token ni sync real por API. `IDENTITY_PROVIDER=local`.
La carga académica se hace por archivo CSV (exportación Q10 → plantilla → Ajustes).
JARVIS no lee tablas directo: pasa por tools y permisos.
