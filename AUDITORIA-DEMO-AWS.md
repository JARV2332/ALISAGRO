# Auditoría — Demo AWS Community Day Guatemala 2026

**Charla:** De Arduino a la nube: construyendo un ecosistema IoT con AWS  
**Proyecto:** ALISAGRO  
**Fecha de la auditoría:** 6 de octubre de 2026  
**Estado:** Fase 0 terminada. No se modificó código de la aplicación, no se crearon recursos AWS y no se tocó producción.

La frase de la demo se mantiene:

> No migramos ALISAGRO a AWS. Extendimos ALISAGRO con AWS.

---

## Hallazgos que definen el diseño

ALISAGRO ya es un dashboard en vivo. React y Vite leen `ali_lecturas_monitoreo` y se actualizan por Realtime. Las tarjetas muestran:

- humedad de suelo
- temperatura de suelo
- temperatura ambiente
- humedad ambiente

El estado visible hoy es la hora de la última lectura y el indicador «En vivo» de Supabase.

El firmware del repositorio no sirve para esta demo tal como está. `hardware/esp32/alisagro_nodo.ino` es código de ESP32: publica por HTTP directo a Supabase cada 10 segundos, con el identificador `nodo-esp32-01`. El Wemos D1 Mini hay que tratarlo como otra placa y otro programa.

Ese firmware ya lleva la clave pública de Supabase dentro del archivo. Para AWS no se repite ese patrón: nada de access keys en el código ni en Git.

El proyecto Supabase es el de producción (`lhbalfmlctawmfbpccfo`). Si la Lambda inserta en `ali_lecturas_monitoreo`, la fila nueva aparece en el dashboard de Vercel, porque esa pantalla muestra la lectura más reciente de toda la tabla. La demo tiene que escribir en una tabla aparte.

En la PC de trabajo, al momento de la auditoría:

- No está instalado AWS CLI, ni SAM, ni CDK, ni Terraform, ni Python, ni Arduino CLI.
- Sí están Node.js 22 y Git.
- AWS MCP no está conectado. El único MCP configurado es n8n, y estaba en error.
- La Raspberry Pi no es accesible desde esta PC.
- Los sensores físicos no se pueden confirmar hasta tenerlos delante.

Git, en el momento de la auditoría:

- Rama `main`, al día con `origin/main` (commit `d3f1f2b`).
- Repo: `https://github.com/JARV2332/ALISAGRO.git`
- Archivo sin seguimiento: `supabase/GUIA_SUPABASE.md`.

---

## A. Arquitectura propuesta

Una sola región: **us-east-1 (Norte de Virginia)**. Ahí están IoT Core, Lambda, S3 y CloudWatch. Desde Guatemala la latencia típica es suficiente para un mensaje por minuto. No se reparte nada en otras regiones.

```text
PLANTA
  │
  ├─ sensores ─ Wemos D1 Mini ─ Wi-Fi ─ AWS IoT Core ─ Rule ─ Lambda ─ Supabase (tabla demo) ─ ALISAGRO
  │                                                      │
  │                                                 CloudWatch Logs
  │
  └─ cámara ─ Raspberry Pi 5 ─ OpenCV (local) ─ resultado en pantalla
                                      │
                                      └─ opcional, después: S3 o Supabase
```

El camino actual ESP32 → Supabase sigue igual. AWS queda al lado, en una rama y una tabla de demo.

El Wemos publica un JSON pequeño al topic `alisagro/demo/alisagro-01/telemetry`, con certificado de dispositivo, cada 60 segundos. Un botón físico manda una lectura al instante, para no esperar un minuto en el escenario. MQTT queda por debajo: en la charla se muestra el mensaje llegando a IoT Core, no el protocolo.

La Lambda valida rangos, traduce los nombres al esquema de ALISAGRO y hace el POST a Supabase. El dashboard ya existente hace el resto.

| Campo del Wemos | Columna en Supabase |
|---|---|
| `deviceId`: `alisagro-01` | `device_id` |
| `temperature` | `temp_ambiente` |
| `humidity` | `humedad_ambiente` |
| `soilMoisture` | `humedad_suelo` |
| `soilTemperature`, si el sensor existe | `temp_suelo` |
| fijo | `metodo_captura` = `IOT` |

La hora la pone Supabase en `created_at`. El reloj del Wemos no hace falta.

La luz no entra en esta primera versión: el dashboard no tiene esa tarjeta y el D1 Mini solo tiene una entrada analógica.

La Raspberry es el segundo acto, independiente. OpenCV en la Pi cuenta proporción de verde, amarillo y marrón en la imagen. Eso es análisis visual, no un diagnóstico de enfermedad ni de nutrición. Si esa parte falla, la demo de sensores sigue en pie.

S3 no entra en el camino crítico. Solo tendría sentido más adelante, si se quiere guardar la foto. PostgreSQL sigue siendo Supabase.

Payload de referencia:

```json
{
  "deviceId": "alisagro-01",
  "temperature": 27.4,
  "humidity": 61.2,
  "soilMoisture": 48.7
}
```

---

## B. Componentes

### Hardware, pendiente de confirmar en la mesa

- Wemos D1 Mini. Hay que leer el chip: ESP8266 o ESP32. Este diseño asume ESP8266, que es el D1 Mini clásico. Si el chip es ESP32, el programa cambia.
- Un solo pin analógico (A0, 0–1023). Prioridad: humedad de suelo.
- Sensores que el firmware viejo esperaba en un ESP32: YL-69, DS18B20 y DHT11. Pueden no ser los que están conectados ahora.
- Raspberry Pi 5, 8 GB, arranque por USB. El lector microSD no se usa.
- Cámara de la Pi, modelo aún desconocido (módulo oficial o USB).

### Software que ya existe y se conserva

- Frontend React 19 + Vite 7 + Tailwind 4, en Vercel.
- Supabase PostgreSQL, tablas `ali_lecturas_monitoreo` y `ali_nodos`.
- Repo `JARV2332/ALISAGRO`, rama de trabajo propuesta: `feature/aws-iot-demo`.

### Piezas nuevas

- Firmware del Wemos, distinto del `.ino` del ESP32.
- Stack SAM en us-east-1.
- Lambda de ingestión en Node.js 22, porque la PC de trabajo ya tiene Node y no tiene Python.
- Tabla nueva `ali_lecturas_aws_demo`, misma forma que la tabla actual.
- Proyecto `~/alisagro-edge/` en la Raspberry, con entorno virtual de Python.

---

## C. Software de la Raspberry

No se instala nada hasta ver el sistema. En la Fase 1, por SSH, hay que anotar:

- modelo
- versión de Raspberry Pi OS
- arquitectura
- espacio libre en el USB
- memoria
- temperatura
- Wi-Fi
- si la cámara aparece

Después de eso, solo esto:

- Python 3 del sistema, `venv` y `pip`
- Git
- SSH
- Herramienta de cámara según lo que se detecte: `rpicam-hello` y `picamera2` si es cámara oficial; OpenCV directo si es webcam USB
- OpenCV y NumPy, dentro del venv
- Diagnóstico ya incluido en el sistema: `vcgencmd measure_temp`, `df`, `free`

`boto3` queda para el día en que la foto tenga que salir de la Pi. No hace falta un modelo entrenado ni PyTorch.

Estructura esperada en la Pi:

```text
~/alisagro-edge/
  venv/
  src/
  camera/
  models/
  requirements.txt
  .env.example
  README.md
```

---

## D. Recursos AWS

Ninguno se creó en la auditoría, porque no hay credenciales de AWS en esta máquina. La lista propuesta, toda en **us-east-1**:

| Recurso | Para qué | Costo orientativo | Cómo quitarlo |
|---|---|---|---|
| IoT Thing `alisagro-01` | Identidad del Wemos | El alta del Thing es operación de registro, céntimos o $0 dentro del free tier | Borrar el Thing al destruir la demo |
| Certificado X.509 y política IoT | El Wemos solo puede conectarse como `alisagro-01` y publicar en su topic | Sin costo relevante de almacenamiento | Desactivar y borrar certificado y política |
| Topic `alisagro/demo/alisagro-01/telemetry` | Telemetría. No es un recurso que se cree aparte | Mensaje ≈ $1 por millón si el free tier ya no aplica | Dejar de publicar |
| IoT Rule `alisagro_demo_ingest` | Pasa el mensaje a Lambda | ≈ $0.15 por millón de reglas + $0.15 por millón de acciones | Se va con el stack |
| Lambda `alisagro-demo-ingest` | Valida y escribe en Supabase | Dentro del millón de invocaciones mensuales, o fracciones de centavo | Se va con el stack |
| Rol IAM de la Lambda | Solo escribir logs de su propio grupo | $0 | Se va con el stack |
| Log group, retención 7 días | Mostrar observabilidad en la charla | Kilobytes; muy por debajo de $0.05 | Se va con el stack, o expira |
| Bucket de artefactos de SAM | Guardar el zip del deploy | Casi $0; hay que borrarlo al final | `sam delete` y vaciar el bucket si queda |
| S3 de fotos | Solo si la Fase 7 lo pide | No crearlo ahora | — |

No entran Device Shadow, registro dinámico, logging detallado de IoT Core, Secrets Manager, API Gateway, EC2 ni base de datos en AWS.

### Free tier y costo realista

Free tier de IoT Core, 12 meses desde la creación de la cuenta:

- 2.250.000 minutos de conexión
- 500.000 mensajes
- 250.000 reglas y 250.000 acciones al mes

Desde el 15 de julio de 2025 las cuentas nuevas también pueden tener créditos de AWS. **No se pudo ver si esta cuenta todavía está en ese periodo.**

Aunque el free tier ya no aplique, un mensaje por minuto durante dos semanas de ensayo queda por debajo de unos **$0.10**. Dejar el dispositivo conectado 24/7 un mes, a un mensaje por minuto, sigue en ese orden.

El escenario que sí sube de ahí es publicar cada segundo durante días: unos pocos dólares. El firmware no va a hacer eso.

Precios de referencia en us-east-1, fuera de free tier:

- Conectividad: $0.08 por millón de minutos (unos $0.042 por dispositivo al año si estuviera 24/7).
- Mensajes: $1 por millón (bloques de 5 KB).
- Reglas: $0.15 por millón de reglas disparadas y $0.15 por millón de acciones.

Antes de crear el stack hay que mirar, en solo lectura, Billing y los recursos ya existentes en la cuenta. No se toca nada que no lleve el nombre de esta demo.

---

## E. Archivos a crear

Cuando se apruebe el plan, en la rama `feature/aws-iot-demo`:

```text
infra/
  template.yaml              # SAM: Lambda, rol, rule, log group
  samconfig.toml.example
  README.md                  # deploy y destroy
infra/scripts/
  provision-thing.ps1        # Thing + certificado; la llave no entra a Git
lambda/ingest/
  index.mjs
  package.json
hardware/wemos-d1-mini/
  alisagro_aws_demo.ino
  config.h.example           # Wi-Fi y endpoint, sin secretos reales
  README.md
scripts/
  simulate-telemetry.mjs     # publica el mismo JSON si el Wemos falla
edge/                        # se copia a la Pi como ~/alisagro-edge
  requirements.txt
  .env.example
  src/analyze_plant.py
  README.md
docs/
  ARQUITECTURA.md
  GUION-DEMO.md
  FALLBACK.md
```

Certificados, `.env` y `config.h` quedan fuera de Git. El `.gitignore` actual ya ignora `.env`.

En el frontend, un solo cambio en la rama: la tabla de lecturas sale de una variable de entorno y, si no existe, sigue siendo `ali_lecturas_monitoreo`. Producción no lleva esa variable. El preview de Vercel sí. El nodo `alisagro-01` se describe en el respaldo local del frontend, sin insertar filas en `ali_nodos`, porque esa tabla la lee el sitio actual.

---

## F. Dependencias

- Cuenta AWS con permiso para IoT, Lambda, IAM, CloudWatch y CloudFormation. Identidad confirmada antes del primer deploy.
- AWS CLI v2 y SAM CLI en la PC de trabajo.
- AWS MCP conectado por OAuth, para consultar la cuenta desde Cursor.
- Arduino IDE con el paquete de placas ESP8266, más ArduinoJson, la librería DHT, OneWire, DallasTemperature y PubSubClient. El TLS lo trae el core de ESP8266.
- Wi-Fi de 2.4 GHz en el lugar del ensayo y en el evento. El D1 Mini no usa 5 GHz.
- Supabase: permiso para crear una tabla nueva y, en la Lambda, la URL y la clave pública en variables de entorno, no en el repositorio.
- Vercel: el preview de la rama. Producción sigue en `main`.
- Raspberry accesible por SSH, con USB de arranque sano y espacio libre.
- Cable USB para grabar el Wemos.

La Lambda depende de IoT Core y de que Supabase acepte el POST. La Raspberry no depende de AWS para el acto de visión.

---

## G. Riesgos

1. **TLS en el ESP8266.** El certificado de AWS IoT cabe justo en la memoria del D1 Mini. Si se le suma DHT, JSON y el sensor, puede reiniciarse. El primer programa del Wemos solo se conecta y publica, sin sensores. Si no cabe, el ensayo usa el publicador de respaldo en la laptop con el mismo topic, y el Wemos muestra la lectura por el puerto serie.
2. **Chip equivocado.** Si la placa dice ESP32, se reescribe el programa. Hay que mirar el impreso antes de elegir librerías.
3. **Un solo analógico.** Humedad de suelo y un sensor de luz analógico no pueden vivir juntos. La luz se corta, salvo que aparezca un sensor I2C.
4. **Misma base que producción.** Una tabla nueva evita que el ensayo mueva el dashboard público. Crear esa tabla igual es un cambio en el proyecto Supabase compartido. Es aditivo y se revierte con `DROP TABLE`. No se ejecuta sin aprobación.
5. **Free tier desconocido.** Hay que mirar la fecha de la cuenta antes del deploy.
6. **La Pi no se ha auditado.** Disco USB lleno, cámara no detectada o Wi-Fi inestable cambian la Fase 1. No se reinstala el sistema operativo por esto.
7. **Internet del venue.** Por eso existen la demo local de la Pi, el JSON simulado y un dashboard con filas ya cargadas.
8. **`metodo_captura` solo acepta `IOT` y `OCR_MANUAL`.** La Lambda manda `IOT`. La visión, si llega a guardarse, va a otra tabla para no alterar esa restricción.

---

## H. Plan por fases

Cada fase termina con prueba, lista de lo que existe, costo y cómo revertirla. No se empieza la siguiente si la anterior no está estable.

| Fase | Qué | Listo cuando |
|---|---|---|
| 0, esta | Auditoría | Hecha. Falta aprobación y, en solo lectura, la cuenta AWS |
| 1 | Raspberry: inventario, SSH, Python, Git, cámara, OpenCV | Una foto de prueba y un script HSV que imprima porcentajes |
| 2 | Wemos: sensor, Wi-Fi, JSON por serie, botón de envío inmediato | Se ve el JSON sin AWS |
| 3 | IoT Core: Thing, certificado, política, topic | El mensaje se ve en el cliente de prueba de la consola |
| 4 | Lambda | El log de CloudWatch muestra el payload validado |
| 5 | Supabase | La fila aparece en `ali_lecturas_aws_demo` |
| 6 | ALISAGRO en la rama | El preview cambia al mojar o secar el sensor |
| 7 | Visión local | La Pi muestra verde / amarillo / seco visual, sin diagnóstico |
| 8 | Integración fina | Solo si sobra tiempo. S3 o guardar el resultado son opcionales |
| 9 | Ensayo físico | Seco, húmedo, cámara, dashboard |
| 10 | Guion, demo alternativa y demo sin internet | Se puede presentar aunque falle una pieza |

---

## I. Qué puede hacer AWS MCP

En la auditoría no podía hacer nada: no está conectado. En Cursor se agrega como servidor remoto:

```text
https://aws-mcp.us-east-1.api.aws/mcp?oauth=initialize
```

La primera vez pide inicio de sesión de AWS. El usuario IAM necesita permiso para autorizar ese OAuth. También hace falta AWS CLI v2 en la PC.

Cuando esté conectado, y siempre con aprobación antes de crear o borrar, puede:

- confirmar identidad, región y si el free tier sigue vigente
- revisar documentación actual de IoT Core y Lambda
- listar recursos para no chocar con nada existente
- ayudar a escribir y desplegar el stack
- leer logs de la Lambda
- diagnosticar un certificado o una regla que no dispara

No se usa para borrar recursos ajenos ni para cambiar producción.

---

## J. Qué hay que hacer en físico

- Confirmar el chip del Wemos y qué sensores están realmente cableados.
- Indicar el SSID de 2.4 GHz del ensayo. La clave queda en `config.h` local, fuera de Git.
- Encender la Raspberry por USB, conectarla a la red y pasar IP o hostname para SSH.
- Conectar la cámara y decir si es módulo oficial o USB.
- Iniciar sesión en AWS la primera vez (CLI y MCP).
- Aprobar la tabla nueva en Supabase y el deploy del stack.
- En el evento: mojar o secar el sensor, pulsar el botón de envío y mostrar la pantalla de la Pi.

---

## K. Qué no hacemos, por tiempo

- Migrar ALISAGRO, sustituir Supabase o Vercel, o rehacer el frontend.
- EC2, bases de datos AWS, SageMaker, Bedrock, Kinesis, API Gateway, Greengrass, Device Shadow y flota de dispositivos.
- Entrenar un modelo o montar un LLM en la Pi.
- Hacer de MQTT el tema de la charla.
- Sensor de luz, S3 y subida de fotos, hasta que el flujo principal esté ensayado.
- Dejar el Wemos publicando cada segundo, o la infraestructura encendida después del evento sin un `destroy`.
- Reinstalar Raspberry Pi OS.
- Escribir en `ali_lecturas_monitoreo` o en `ali_nodos` desde la demo.
- Guardar certificados o claves AWS en Git.

---

## Plan de respaldo

| Si falla | Qué se muestra |
|---|---|
| La visión / la cámara | Una captura ya analizada en la Pi |
| AWS | El Wemos imprime el JSON por serie y se explica el diagrama |
| Internet | La Pi corre el análisis sola |
| El Wemos | `simulate-telemetry.mjs` publica el mismo JSON |
| Supabase en vivo | El preview queda con filas cargadas antes de subir al escenario |

La demo principal (sensor → AWS → Supabase → ALISAGRO) no depende de la Raspberry.

---

## Decisiones pendientes de aprobación

1. Región **us-east-1**.
2. Infraestructura con **AWS SAM**.
3. Tabla nueva **`ali_lecturas_aws_demo`**, sin escribir en las tablas que usa producción.
4. Visión solo local en la Pi, y S3 más adelante solo si hace falta.

Hasta esa aprobación no se crea infraestructura AWS ni se modifica código de la aplicación.

### Siguiente paso, después de aprobar

Sigue siendo de solo lectura: conectar AWS CLI y AWS MCP, ver la cuenta y la región, y confirmar el free tier. En paralelo: encender la Raspberry y confirmar el chip del Wemos.

---

## Cierre de esta fase

- No cambió ningún archivo de la aplicación al hacer la auditoría.
- Este documento es el único archivo agregado para poder leer el resultado.
- No hay recursos AWS nuevos.
- El costo de lo revisado es $0.
- No hay recursos que revertir.
