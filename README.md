# Sistema POS — Cafetería TecNM León

## Requisitos
- Node.js 20+
- Docker Desktop

## Levantar por primera vez

```bash
# 1. Backend
cd backend
docker compose down -v          # limpiar volumen anterior si existe
docker compose up -d --build    # construir y levantar
docker compose logs api --follow  # esperar "🚀 API escuchando..."

# 2. Migración y datos iniciales (una sola vez)
docker compose exec api npx prisma migrate dev --name init
docker compose exec api npx tsx prisma/seed.ts

# 3. Frontend (en otra terminal, desde la carpeta raíz)
cd ..
npm install
npm run dev
```

## Credenciales

| Email | Contraseña | Rol |
|-------|-----------|-----|
| abraham@tecnm.mx | admin123 | Administrador |
| mario@tecnm.mx | 1234 | Cajero |
| ana@tecnm.mx | 1234 | Mesero |

## URLs
- Frontend: http://localhost:5173
- API: http://localhost:4000
- pgAdmin: `docker compose --profile tools up -d` → http://localhost:5050

## Si ves "Unique constraint failed on id"
```bash
cd backend
docker compose down -v
docker compose up -d --build
docker compose exec api npx prisma migrate dev --name init
docker compose exec api npx tsx prisma/seed.ts
```
