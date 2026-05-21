import { ALI_METRICAS } from './alisagroConfig.js'

export function rangoFechasPorDefecto(dias = 7) {
  const hasta = new Date()
  const desde = new Date()
  desde.setDate(desde.getDate() - dias)
  return {
    desde: desde.toISOString().slice(0, 10),
    hasta: hasta.toISOString().slice(0, 10),
  }
}

export function inicioDelDia(fechaYYYYMMDD) {
  return new Date(`${fechaYYYYMMDD}T00:00:00`).toISOString()
}

export function finDelDia(fechaYYYYMMDD) {
  return new Date(`${fechaYYYYMMDD}T23:59:59.999`).toISOString()
}

export function formatearFechaReporte(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function etiquetaDispositivo(deviceId, nodosMap = {}) {
  const n = nodosMap[deviceId]
  if (!n) return deviceId
  return n.parcela ? `${n.parcela} (${n.nombre})` : n.nombre || deviceId
}

function valoresNumericos(lecturas, campo) {
  return lecturas
    .map((r) => Number(r[campo]))
    .filter((v) => !Number.isNaN(v))
}

export function calcularResumen(lecturas, idsMetricas = ALI_METRICAS.map((m) => m.id)) {
  const resumen = {
    total: lecturas.length,
    porMetrica: {},
  }

  for (const id of idsMetricas) {
    const vals = valoresNumericos(lecturas, id)
    const meta = ALI_METRICAS.find((m) => m.id === id)
    if (!vals.length) {
      resumen.porMetrica[id] = { min: null, max: null, promedio: null, ultimo: null, meta }
      continue
    }
    const suma = vals.reduce((a, b) => a + b, 0)
    const ultimaFila = [...lecturas].reverse().find((r) => r[id] != null && !Number.isNaN(Number(r[id])))
    resumen.porMetrica[id] = {
      min: Math.min(...vals),
      max: Math.max(...vals),
      promedio: suma / vals.length,
      ultimo: ultimaFila ? Number(ultimaFila[id]) : null,
      meta,
    }
  }

  return resumen
}

/** Puntos para gráfica de líneas (orden cronológico) */
export function datosSerieTemporal(lecturas, idsMetricas, nodosMap) {
  return lecturas.map((r) => {
    const punto = {
      ts: r.created_at,
      etiqueta: formatearFechaReporte(r.created_at),
      dispositivo: etiquetaDispositivo(r.device_id, nodosMap),
      device_id: r.device_id,
    }
    for (const id of idsMetricas) {
      const v = Number(r[id])
      punto[id] = Number.isNaN(v) ? null : v
    }
    return punto
  })
}

/** Promedio por dispositivo para una métrica */
export function promediosPorDispositivo(lecturas, metricaId, nodosMap) {
  const acum = {}
  for (const r of lecturas) {
    const v = Number(r[metricaId])
    if (Number.isNaN(v)) continue
    if (!acum[r.device_id]) acum[r.device_id] = { suma: 0, n: 0 }
    acum[r.device_id].suma += v
    acum[r.device_id].n += 1
  }
  return Object.entries(acum)
    .map(([device_id, { suma, n }]) => ({
      device_id,
      nombre: etiquetaDispositivo(device_id, nodosMap),
      promedio: suma / n,
    }))
    .sort((a, b) => b.promedio - a.promedio)
}

export function exportarCsv(lecturas, nodosMap) {
  const cabecera = [
    'fecha',
    'device_id',
    'dispositivo',
    'metodo',
    'temp_suelo',
    'humedad_suelo',
    'temp_ambiente',
    'humedad_ambiente',
  ]
  const filas = lecturas.map((r) =>
    [
      r.created_at,
      r.device_id,
      etiquetaDispositivo(r.device_id, nodosMap).replace(/,/g, ' '),
      r.metodo_captura,
      r.temp_suelo ?? '',
      r.humedad_suelo ?? '',
      r.temp_ambiente ?? '',
      r.humedad_ambiente ?? '',
    ].join(',')
  )
  const csv = [cabecera.join(','), ...filas].join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `alisagro-reporte-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
