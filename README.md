# ALISAGRO

Sistema IoT + OCR para monitoreo de cultivos (suelo y ambiente) con **Supabase** en tiempo real.

## Stack

- **Frontend:** React + Vite + Tailwind CSS v4
- **Backend / datos:** [Supabase](https://lhbalfmlctawmfbpccfo.supabase.co) (`ali_lecturas_monitoreo`, `ali_nodos`)
- **OCR:** Tesseract.js (gratis, en el navegador)
- **Hardware:** ESP32 (`hardware/esp32/alisagro_nodo.ino`)

## Desarrollo local

```bash
npm install
cp .env.example .env   # pegar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev
```

Ejecutar en Supabase SQL Editor (en orden):

1. `supabase/migrations/001_ali_lecturas_monitoreo.sql`
2. `supabase/migrations/002_ali_nodos.sql`

Ver `supabase/SETUP.md` para Realtime y pruebas.

## Variables de entorno (Vite)

| Variable | Descripción |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave **anon** o **publishable** (Settings → API) |

Opcional: `VITE_SUPABASE_PUBLISHABLE_KEY` (mismo uso que anon).

## Despliegue en Vercel

1. Importar repo [JARV2332/ALISAGRO](https://github.com/JARV2332/ALISAGRO) en [vercel.com/new](https://vercel.com/new).
2. Framework: **Vite** (detectado por `vercel.json`).
3. En **Settings → Environment Variables** añadir las dos variables `VITE_*` (Production, Preview, Development).
4. **Deploy**.

La cámara OCR requiere **HTTPS**; en Vercel funciona automáticamente.

### Supabase tras publicar

- Las claves `anon` / `publishable` son públicas por diseño (RLS en tablas).
- Active **Realtime** en `ali_lecturas_monitoreo` (ver `supabase/SETUP.md`).
- No hace falta whitelist de dominio para REST; el dashboard usa la clave anon.

## Scripts

| Comando | Uso |
|---------|-----|
| `npm run dev` | Servidor local |
| `npm run build` | Build producción → `dist/` |
| `npm run preview` | Probar build local |

## Licencia

Proyecto académico / demo AGTECH — ALISAGRO.
