import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ALI_METRICAS } from '../lib/alisagroConfig.js'

function TooltipCustom({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-dark-border bg-dark-panel px-3 py-2 text-xs shadow-lg">
      <p className="text-dark-muted mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value != null ? Number(p.value).toFixed(1) : '—'}
        </p>
      ))}
    </div>
  )
}

export function GraficaLineas({ datos, metricasActivas, altura = 320 }) {
  if (!datos?.length || !metricasActivas?.length) {
    return (
      <p className="text-sm text-dark-muted text-center py-12">Sin datos para graficar en este rango.</p>
    )
  }

  const metricas = ALI_METRICAS.filter((m) => metricasActivas.includes(m.id))
  const muestra = datos.length > 80 ? datos.filter((_, i) => i % Math.ceil(datos.length / 80) === 0) : datos

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <LineChart data={muestra} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
        <XAxis
          dataKey="etiqueta"
          tick={{ fill: '#9ca3af', fontSize: 10 }}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
        <Tooltip content={<TooltipCustom />} />
        <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
        {metricas.map((m) => (
          <Line
            key={m.id}
            type="monotone"
            dataKey={m.id}
            name={`${m.label} (${m.unidad})`}
            stroke={m.color}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

export function GraficaBarrasDispositivos({ datos, metricaId, altura = 280 }) {
  if (!datos?.length) {
    return (
      <p className="text-sm text-dark-muted text-center py-12">Sin promedios por dispositivo.</p>
    )
  }

  const meta = ALI_METRICAS.find((m) => m.id === metricaId)

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={datos} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" horizontal={false} />
        <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey="nombre"
          width={120}
          tick={{ fill: '#9ca3af', fontSize: 10 }}
        />
        <Tooltip content={<TooltipCustom />} />
        <Bar
          dataKey="promedio"
          name={meta ? `${meta.label} (${meta.unidad})` : 'Promedio'}
          fill={meta?.color ?? '#a4c639'}
          radius={[0, 6, 6, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
