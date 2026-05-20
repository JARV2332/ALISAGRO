# Publicar ALISAGRO en GitHub + Vercel

## 1. Supabase (una sola vez)

En [Supabase SQL Editor](https://supabase.com/dashboard/project/lhbalfmlctawmfbpccfo/sql):

1. Ejecutar `supabase/migrations/001_ali_lecturas_monitoreo.sql`
2. Ejecutar `supabase/migrations/002_ali_nodos.sql`
3. **Database → Replication / Realtime** → activar `ali_lecturas_monitoreo`

Copiar de **Settings → API**:

- Project URL → `VITE_SUPABASE_URL`
- `anon` o `publishable` key → `VITE_SUPABASE_ANON_KEY`

## 2. GitHub

Repo: https://github.com/JARV2332/ALISAGRO.git

```bash
git init
git add .
git commit -m "ALISAGRO: dashboard IoT, OCR, nodos y Supabase"
git branch -M main
git remote add origin https://github.com/JARV2332/ALISAGRO.git
git push -u origin main
```

## 3. Vercel

1. https://vercel.com/new → Import **JARV2332/ALISAGRO**
2. No cambiar build: usa `vercel.json` (`npm run build`, salida `dist`)
3. **Environment Variables**:

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | `https://lhbalfmlctawmfbpccfo.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | tu clave publishable/anon |

4. Deploy → copiar URL (`https://alisagro-xxx.vercel.app`)

## 4. Comprobar

- Abrir URL de Vercel → pestaña **Monitoreo** (lecturas o vacío)
- Pestaña **Captura OCR** → cámara (permiso del navegador)
- Insertar lectura de prueba en Supabase y ver actualización en vivo

## CLI alternativa (opcional)

```bash
npx vercel login
npx vercel link
npx vercel env add VITE_SUPABASE_URL production
npx vercel env add VITE_SUPABASE_ANON_KEY production
npx vercel --prod
```
