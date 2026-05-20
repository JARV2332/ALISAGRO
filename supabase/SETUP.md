# ALISAGRO — Configuración Supabase

Proyecto: **https://lhbalfmlctawmfbpccfo.supabase.co**

Las tablas de ALISAGRO usan prefijo **`ali_`** y no modifican tablas que ya tengas en el mismo proyecto.

---

## Paso 1 — Ejecutar el script SQL (obligatorio)

1. Entra a [Supabase Dashboard](https://supabase.com/dashboard/project/lhbalfmlctawmfbpccfo).
2. Menú **SQL Editor** → **New query**.
3. Abre y copia **todo** el archivo:
   `supabase/migrations/001_ali_lecturas_monitoreo.sql`
4. Pega en el editor y pulsa **Run**.

Debe crearse la tabla: **`public.ali_lecturas_monitoreo`**

Si al final aparece error en `ALTER PUBLICATION ...` diciendo que la tabla ya está en la publicación, **ignóralo** (ya está bien).

### Paso 1b — Ubicación de nodos (parcela, finca)

Ejecuta también:

`supabase/migrations/002_ali_nodos.sql`

Crea **`public.ali_nodos`** con parcela, ubicación y finca por `device_id`. El dashboard muestra dónde está cada nodo. Puedes editar los datos en **Table Editor → ali_nodos** o con SQL:

```sql
UPDATE public.ali_nodos
SET parcela = 'Parcela X · Lote 5',
    ubicacion = 'Hilera 20–25, sector sur',
    finca = 'Tu finca'
WHERE device_id = 'nodo-esp32-01';
```

---

## Paso 2 — Activar Realtime (recomendado)

1. **Database** → **Replication** (o **Realtime** según tu versión del panel).
2. Busca la tabla **`ali_lecturas_monitoreo`** y actívala.

Sin esto el dashboard carga datos pero no se actualiza solo al insertar.

---

## Paso 3 — Probar inserción de prueba (opcional)

En SQL Editor ejecuta:

```sql
INSERT INTO public.ali_lecturas_monitoreo (
  device_id, temp_suelo, humedad_suelo, temp_ambiente, humedad_ambiente, metodo_captura
) VALUES (
  'nodo-esp32-01', 22.4, 48.0, 26.1, 61.0, 'IOT'
);
```

Luego en **Table Editor** verifica que aparezca la fila.

---

## Paso 4 — Frontend local

El archivo `.env` del proyecto ya tiene:

```env
VITE_SUPABASE_URL=https://lhbalfmlctawmfbpccfo.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

Reinicia Vite después de cambiar `.env`:

```bash
npm run dev
```

Abre el navegador y revisa el panel **Monitoreo en vivo**.

---

## Paso 4b — Vercel (producción)

Tras desplegar en Vercel, en el proyecto añade las mismas variables que en `.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Vuelve a desplegar si las añades después del primer build. Guía: `DEPLOY.md` en la raíz del repo.

---

## Paso 5 — ESP32 (cuando uses hardware)

En `hardware/esp32/alisagro_nodo.ino` ya apuntan la misma URL, clave y tabla `ali_lecturas_monitoreo`. Solo configura **WiFi** (`WIFI_SSID`, `WIFI_PASSWORD`).

---

## Resumen de nombres

| Uso | Nombre |
|-----|--------|
| Tabla lecturas | `ali_lecturas_monitoreo` |
| Tabla nodos (ubicación) | `ali_nodos` |
| REST lecturas | `/rest/v1/ali_lecturas_monitoreo` |
| REST nodos | `/rest/v1/ali_nodos` |
| OCR device_id | `PANTALLA_OCR_MANUAL` |
| IoT device_id | `nodo-esp32-01` (editable en .ino) |

---

## Si ves error en el dashboard

| Mensaje | Solución |
|---------|----------|
| `relation "ali_lecturas_monitoreo" does not exist` | Ejecuta el script del Paso 1 |
| `permission denied` / RLS | Vuelve a ejecutar el script (políticas + GRANT) |
| Datos no llegan en vivo | Paso 2 Realtime + recarga la web |
| `.env` no aplicado | Detén `npm run dev` y vuelve a iniciar |
