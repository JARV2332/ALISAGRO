# Demo AWS — qué ya está y qué falta

La Raspberry puede esperar. Esto es lo que ya quedó en la rama `feature/aws-iot-demo`, sin crear recursos en AWS y sin tocar el sitio de producción.

## Qué hace cada pieza

| Pieza | Dónde | Estado |
|---|---|---|
| Tabla de la demo | `supabase/migrations/003_ali_lecturas_aws_demo.sql` | Escrita. Hay que ejecutarla en el SQL Editor |
| Lambda | `lambda/ingest/` | Lista. Traduce el JSON del Wemos y lo inserta en Supabase |
| Infraestructura | `infra/template.yaml` | Lista para `sam deploy`. Aún no está desplegada |
| Wemos | `hardware/wemos-d1-mini/alisagro_aws_demo.ino` | Listo para compilar cuando copies `secrets.h` |
| Respaldo sin Wemos | `scripts/simulate-telemetry.mjs` | Publica el mismo JSON con AWS CLI |
| Dashboard | rama actual | Si no defines la variable nueva, sigue leyendo la tabla de producción |
| Webcam USB | `edge/src/analyze_plant.py` | Listo para copiar a la Pi cuando haya SSH |

Producción sigue en Vercel y en `ali_lecturas_monitoreo`. La demo escribe en `ali_lecturas_aws_demo`.

## Orden para encenderlo

1. En Supabase → SQL Editor, ejecuta `supabase/migrations/003_ali_lecturas_aws_demo.sql`.
2. En esta PC instala [AWS CLI v2](https://aws.amazon.com/cli/) y [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html), e inicia sesión.
3. Desde `infra/`:

```powershell
sam build
sam deploy --guided --region us-east-1 --stack-name alisagro-aws-demo --capabilities CAPABILITY_IAM --parameter-overrides SupabaseUrl=https://lhbalfmlctawmfbpccfo.supabase.co SupabaseKey=TU_CLAVE SupabaseTable=ali_lecturas_aws_demo
```

La clave es la publishable o anon. No la guardes en Git.

4. Crea la identidad del Wemos (una sola vez):

```powershell
.\infra\scripts\provision-thing.ps1 -WifiSsid "TU_RED" -WifiPassword "TU_CLAVE"
```

Eso escribe `hardware/wemos-d1-mini/secrets.h`. Ese archivo no se sube a Git.

5. Abre `alisagro_aws_demo.ino` en Arduino IDE, placa **LOLIN(WEMOS) D1 R2 & mini**, y grábalo. En el monitor serie a 115200, la letra `s` envía una lectura al momento.
6. En el frontend de esta rama, para ver la tabla de la demo:

```env
VITE_ALI_TABLA_LECTURAS=ali_lecturas_aws_demo
```

Sin esa variable, el dashboard sigue en la tabla actual.
7. Si el Wemos aún no publica, desde la PC:

```powershell
node scripts/simulate-telemetry.mjs --soil 22 --temp 27.4 --humidity 61
```

## Qué se crearía en AWS

Región **us-east-1**, stack `alisagro-aws-demo`:

- Lambda `alisagro-demo-ingest` (128 MB, se apaga sola)
- Regla de IoT Core hacia esa Lambda
- Log group de 7 días
- Thing `alisagro-01`, un certificado y una política que solo puede publicar en `alisagro/demo/alisagro-01/telemetry`

Con un mensaje por minuto el costo de ensayo queda por debajo de unos $0.10 aunque el free tier ya no aplique. No dejes el Wemos publicando cada segundo.

## Cómo quitarlo después del evento

```powershell
.\infra\scripts\destroy-demo.ps1 -Confirm -IncludeThing
```

En Supabase, si quieres borrar los datos de ensayo:

```sql
DROP TABLE IF EXISTS public.ali_lecturas_aws_demo;
```

## Raspberry, cuando tengas SSH

En la Pi, dentro de una carpeta `~/alisagro-edge`:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python src/analyze_plant.py
```

La webcam USB es la cámara 0. El texto en pantalla es un análisis visual, no un diagnóstico.

## Wi-Fi del Wemos

Tiene que ser de 2.4 GHz. El D1 Mini no se conecta a redes solo de 5 GHz.
