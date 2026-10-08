const RANGES = {
  temperature: [-10, 60],
  humidity: [0, 100],
  soilMoisture: [0, 100],
  soilTemperature: [-10, 60],
}

const FIELDS = [
  ['temperature', 'temp_ambiente'],
  ['humidity', 'humedad_ambiente'],
  ['soilMoisture', 'humedad_suelo'],
  ['soilTemperature', 'temp_suelo'],
]

function round1(n) {
  return Math.round(n * 10) / 10
}

/** Traduce el JSON del Wemos al esquema de ALISAGRO. No llama a la red. */
export function mapReading(event) {
  const msg = Array.isArray(event) ? event[0] : event
  if (!msg || typeof msg !== 'object') {
    return { ok: false, error: 'Payload vacío' }
  }

  const deviceId = String(msg.deviceId ?? msg.device_id ?? '').trim()
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(deviceId)) {
    return { ok: false, error: 'deviceId inválido' }
  }

  const row = {
    device_id: deviceId,
    metodo_captura: 'IOT',
  }

  let metrics = 0
  for (const [from, to] of FIELDS) {
    if (msg[from] === undefined || msg[from] === null || msg[from] === '') continue
    const n = Number(msg[from])
    const [min, max] = RANGES[from]
    if (!Number.isFinite(n) || n < min || n > max) {
      return { ok: false, error: `${from} fuera de rango (${min} a ${max})` }
    }
    row[to] = round1(n)
    metrics += 1
  }

  if (metrics === 0) {
    return { ok: false, error: 'Sin mediciones' }
  }

  return { ok: true, row }
}
