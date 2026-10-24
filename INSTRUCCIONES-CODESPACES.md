# Biblioteca UNIOC — Instrucciones para Codespaces

## 1. Base de datos
```bash
docker compose up -d
```

## 2. Backend
```bash
cd backend
cat > .env << 'ENVEOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/biblioteca?schema=public
JWT_SECRET=un_secreto_largo_de_al_menos_32_caracteres_aqui_123
JWT_REFRESH_SECRET=otro_secreto_largo_diferente_de_32_o_mas_456
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
ENVEOF

npx prisma generate
npx prisma migrate deploy
npx tsx prisma/seed.ts
npm install
npm run start:dev
```

## 3. Frontend (otra terminal)
1. En Ports pon el puerto 3001 en Public y copia la URL.
2. Ejecuta:
```bash
cd frontend
echo 'VITE_API_URL=https://TU-URL-3001.app.github.dev' > .env
npm install
npm run dev
```

## Cuentas
Contraseña: Prueba123!
- superadmin@universidad.edu
- bibliotecaria@universidad.edu
- ana.estudiante@universidad.edu

## JARVIS
Funciona en modo básico (heurístico). Puede consultar catálogo, préstamos propios y explicar cómo solicitar libros.
