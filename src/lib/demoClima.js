export const DEMO_CLIMA_DEVICE_ID = 'nodo-demo-z4-guatemala'

const HISTORIAL_KEY = 'alisagro-demo-clima-z4'
const OPEN_METEO_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=14.613&longitude=-90.535&current=temperature_2m,relative_humidity_2m,precipitation&timezone=America%2FGuatemala'

function redondear(valor) {
  return Math.round(valor * 10) / 10
}

export function leerHistorialDemo() {
  try {
    const historial = JSON.parse(localStorage.getItem(HISTORIAL_KEY) ?? '[]')
    return Array.isArray(historial) ? historial : []
  } catch {
    return []
  }
}

function guardarEnHistorial(lectura) {
  const historial = [lectura, ...leerHistorialDemo()].slice(0, 10)
  localStorage.setItem(HISTORIAL_KEY, JSON.stringify(historial))
  return historial
}

export async function crearLecturaDemo() {
  const respuesta = await fetch(OPEN_METEO_URL)
  if (!respuesta.ok) throw new Error('No se pudo consultar el clima de Zona 4')

  const { current } = await respuesta.json()
  const temperatura = Number(current?.temperature_2m)
  const humedad = Number(current?.relative_humidity_2m)
  const precipitacion = Number(current?.precipitation ?? 0)
  if (!Number.isFinite(temperatura) || !Number.isFinite(humedad)) {
    throw new Error('El servicio de clima no devolvió datos válidos')
  }

  const lectura = {
    id: `demo-clima-${Date.now()}`,
    created_at: new Date().toISOString(),
    device_id: DEMO_CLIMA_DEVICE_ID,
    temp_ambiente: redondear(temperatura),
    humedad_ambiente: redondear(humedad),
    // Open-Meteo no mide el suelo: se estiman solo para visualizar el demo.
    temp_suelo: redondear(temperatura - 2.5),
    humedad_suelo: redondear(Math.min(70, Math.max(35, 45 + humedad * 0.12 + precipitacion * 4))),
    metodo_captura: 'DEMO_CLIMA',
  }

  return { lectura, historial: guardarEnHistorial(lectura) }
}
