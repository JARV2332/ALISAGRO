/** Tabla Supabase con prefijo Ali (no colisiona con tablas previas del proyecto).
 *  Producción no define VITE_ALI_TABLA_LECTURAS y sigue en ali_lecturas_monitoreo.
 *  La demo AWS usa ali_lecturas_aws_demo. */
export const ALI_TABLA_LECTURAS =
  import.meta.env.VITE_ALI_TABLA_LECTURAS || 'ali_lecturas_monitoreo'
/** Solo la página /aws. El inicio no la usa. */
export const ALI_TABLA_DEMO_AWS = 'ali_lecturas_aws_demo'
export const ALI_TABLA_NODOS = 'ali_nodos'

export const ALI_DEVICE_OCR = 'PANTALLA_OCR_MANUAL'
export const ALI_DEVICE_DEMO_CLIMA = 'nodo-demo-z4-guatemala'
export const ALI_METODO_IOT = 'IOT'
export const ALI_METODO_OCR = 'OCR_MANUAL'
export const ALI_METODO_DEMO = 'DEMO_CLIMA'

/** Sensores / variables disponibles en reportes y gráficas */
export const ALI_METRICAS = [
  { id: 'humedad_suelo', label: 'Humedad suelo', unidad: '%', color: '#a4c639', grupo: 'suelo' },
  { id: 'temp_suelo', label: 'Temp. suelo', unidad: '°C', color: '#fbbf24', grupo: 'suelo' },
  { id: 'humedad_ambiente', label: 'Humedad ambiente', unidad: '%', color: '#38bdf8', grupo: 'ambiente' },
  { id: 'temp_ambiente', label: 'Temp. ambiente', unidad: '°C', color: '#f87171', grupo: 'ambiente' },
]

export const ALI_LIMITE_REPORTE = 2000

/** Respaldo local si aún no ejecutaste 002_ali_nodos.sql en Supabase */
export const ALI_NODOS_FALLBACK = {
  'nodo-esp32-01': {
    nombre: 'Nodo suelo — Parcela A',
    parcela: 'Parcela A · Lote 3',
    ubicacion: 'Sector norte, hilera 12–18',
    finca: 'Finca El Retiro',
    cultivo: 'Café arábica',
    notas: 'Sensores YL-69, DS18B20 y DHT11',
  },
  [ALI_DEVICE_OCR]: {
    nombre: 'Captura manual OCR',
    parcela: 'Parcela B · Punto de muestreo',
    ubicacion: 'Termómetro LCD en bodega de campo',
    finca: 'Finca El Retiro',
    cultivo: null,
    notas: 'Solo temperatura y humedad ambiente',
  },
  'alisagro-01': {
    nombre: 'Nodo demo AWS',
    parcela: 'Mesa de la charla',
    ubicacion: 'Wemos D1 Mini',
    finca: 'AWS Community Day',
    cultivo: 'Planta de demostración',
    notas: 'Telemetría por AWS IoT Core',
  },
  [ALI_DEVICE_DEMO_CLIMA]: {
    nombre: 'Demo clima — Zona 4',
    parcela: 'Zona 4',
    ubicacion: 'Ciudad de Guatemala',
    finca: 'Datos meteorológicos públicos',
    cultivo: null,
    notas: 'Clima real de Open-Meteo; valores de suelo estimados para demostración',
  },
}
