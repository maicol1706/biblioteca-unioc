# Fase 2 — Base de datos

## Objetivo

Dejar el modelo relacional listo para las fases de autenticación y circulación, con integridad referencial, índices y datos de prueba locales.

## Archivos

| Ruta | Función |
| --- | --- |
| `backend/prisma/schema.prisma` | Modelo Prisma (fuente de tipos) |
| `backend/prisma/migrations/0001_init/migration.sql` | DDL PostgreSQL |
| `backend/prisma/seed.ts` | Roles, permisos, usuarios, catálogo, settings |
| `backend/package.json` | Scripts `prisma:deploy` y `prisma:seed` |

## Decisiones

1. `books` representa la obra; `copies` representa el ejemplar físico.
2. Autores y libros se relacionan N:N en `book_authors`.
3. Un préstamo apunta a un ejemplar, no al libro.
4. Una solicitud puede existir sin ejemplar asignado.
5. La reserva se encola por `book_id`.
6. Plazos y recordatorios viven en `system_settings`, no en el código.
7. `audit_logs` es de solo inserción a nivel de diseño.
8. Identidad Q10 no se sincroniza todavía; `identity_source=LOCAL`.

## Restricciones extra (SQL)

- Un ejemplar no puede tener dos préstamos `ACTIVE` u `OVERDUE`.
- Una sola reserva `QUEUED` o `NOTIFIED` por usuario y libro.
- Posición de cola única por libro mientras esté `QUEUED`.
- Una sola solicitud `PENDING` por usuario y libro.
- Año de publicación entre 1450 y 2100.
- `queue_position > 0`.

## Cómo ejecutar

```bash
cd library-system
docker compose up -d
cd backend
npm install
npx prisma migrate deploy
npx tsx prisma/seed.ts
```

## Cómo probar

```sql
SELECT code FROM roles ORDER BY code;
SELECT email, identity_source FROM users;
SELECT b.title, count(c.id) FILTER (WHERE c.status = 'AVAILABLE') AS disponibles
FROM books b
JOIN copies c ON c.book_id = b.id
GROUP BY b.title;
SELECT key, value FROM system_settings ORDER BY key;
```

Prueba negativa de integridad (debe fallar):

```sql
-- mismo barcode dos veces
INSERT INTO copies (id, book_id, copy_code, barcode, status, created_at, updated_at)
SELECT gen_random_uuid(), book_id, '999', barcode, 'AVAILABLE', now(), now()
FROM copies LIMIT 1;
```

## Cuentas de prueba

Contraseña común: `Prueba123!` (hash Argon2id).

- superadmin@universidad.edu
- bibliotecaria@universidad.edu
- docente.redes@universidad.edu
- docente.prog@universidad.edu
- ana.estudiante@universidad.edu
- luis.estudiante@universidad.edu
- maria.estudiante@universidad.edu

## Fuera de esta fase

Login, JWT, guards y pantallas. Eso es Fase 3.
