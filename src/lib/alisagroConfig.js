/** Tabla Supabase con prefijo Ali (no colisiona con tablas previas del proyecto) */
export const ALI_TABLA_LECTURAS = 'ali_lecturas_monitoreo'
export const ALI_TABLA_NODOS = 'ali_nodos'

export const ALI_DEVICE_OCR = 'PANTALLA_OCR_MANUAL'
export const ALI_METODO_IOT = 'IOT'
export const ALI_METODO_OCR = 'OCR_MANUAL'

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
}
