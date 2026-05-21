import { ALI_METRICAS } from '../lib/alisagroConfig.js'
import { etiquetaDispositivo, formatearFechaReporte } from '../lib/reportesUtils.js'

function SvgLineas({ datos, metricasIds, ancho = 500, alto = 140 }) {
  if (!datos?.length || !metricasIds?.length) {
    return <p className="pdf-muted">Sin datos para gráfica</p>
  }

  const metricas = ALI_METRICAS.filter((m) => metricasIds.includes(m.id))
  const muestra =
    datos.length > 60 ? datos.filter((_, i) => i % Math.ceil(datos.length / 60) === 0) : datos

  const totalPts = muestra.length
  const series = metricas.map((m) => ({
    meta: m,
    puntos: muestra
      .map((d, i) => ({ i, v: d[m.id] }))
      .filter((p) => p.v != null && !Number.isNaN(Number(p.v))),
  }))

  const todosValores = series.flatMap((s) => s.puntos.map((p) => p.v))
  if (!todosValores.length) return <p className="pdf-muted">Sin valores numéricos</p>

  const min = Math.min(...todosValores)
  const max = Math.max(...todosValores)
  const rango = max - min || 1
  const pad = 28
  const w = ancho - pad * 2
  const h = alto - pad * 2

  const xAt = (idx) => pad + (idx / Math.max(1, totalPts - 1)) * w
  const yAt = (v) => pad + h - ((v - min) / rango) * h

  return (
    <svg width={ancho} height={alto} className="pdf-svg-chart" aria-hidden>
      <rect x={0} y={0} width={ancho} height={alto} fill="#f8faf5" rx="8" />
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = pad + h * (1 - t)
        return (
          <line key={t} x1={pad} y1={y} x2={ancho - pad} y2={y} stroke="#e5e7eb" strokeWidth="1" />
        )
      })}
      {series.map(({ meta, puntos }) => {
        if (puntos.length < 2) return null
        const d = puntos
          .map((p, idx) => {
            const x = xAt(p.i)
            const y = yAt(Number(p.v))
            return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
          })
          .join(' ')
        return (
          <path
            key={meta.id}
            d={d}
            fill="none"
            stroke={meta.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )
      })}
      {series.map(({ meta, puntos }) =>
        puntos.map((p, idx) => (
          <circle
            key={`${meta.id}-${idx}`}
            cx={xAt(p.i)}
            cy={yAt(Number(p.v))}
            r="3"
            fill={meta.color}
          />
        ))
      )}
    </svg>
  )
}

function Leyenda({ metricasIds }) {
  return (
    <div className="pdf-leyenda">
      {ALI_METRICAS.filter((m) => metricasIds.includes(m.id)).map((m) => (
        <span key={m.id} className="pdf-leyenda-item">
          <span className="pdf-leyenda-dot" style={{ background: m.color }} />
          {m.label}
        </span>
      ))}
    </div>
  )
}

export default function ReportPdfTemplate({
  fechaDesde,
  fechaHasta,
  dispositivosEtiquetas = [],
  metricasSel = [],
  metodoLabel = 'Todos',
  resumen,
  serie = [],
  barras = [],
  lecturas = [],
  nodos = {},
}) {
  const metricas = ALI_METRICAS.filter((m) => metricasSel.includes(m.id))
  const filasTabla = [...lecturas].reverse().slice(0, 80)
  const generado = new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date())

  return (
    <div className="pdf-report-document">
      <header className="pdf-header">
        <div className="pdf-header-brand">
          <div className="pdf-logo-mark" aria-hidden />
          <div>
            <h1 className="pdf-title">
              ALISA<span className="pdf-title-accent">GRO</span>
            </h1>
            <p className="pdf-subtitle">Reporte de monitoreo agrícola</p>
          </div>
        </div>
        <div className="pdf-header-meta">
          <p>
            <strong>Generado:</strong> {generado}
          </p>
          <p>
            <strong>Periodo:</strong> {fechaDesde} → {fechaHasta}
          </p>
          <p>
            <strong>Origen:</strong> {metodoLabel}
          </p>
        </div>
      </header>

      <section className="pdf-section">
        <h2 className="pdf-section-title">Filtros aplicados</h2>
        <div className="pdf-filtros-box">
          <p>
            <strong>Dispositivos:</strong>{' '}
            {dispositivosEtiquetas.length
              ? dispositivosEtiquetas.join(' · ')
              : 'Ninguno'}
          </p>
          <p>
            <strong>Métricas:</strong> {metricas.map((m) => m.label).join(', ') || '—'}
          </p>
        </div>
      </section>

      <section className="pdf-section">
        <h2 className="pdf-section-title">Resumen ejecutivo</h2>
        <div className="pdf-kpi-row">
          <div className="pdf-kpi">
            <span className="pdf-kpi-label">Total lecturas</span>
            <span className="pdf-kpi-value">{resumen?.total ?? 0}</span>
          </div>
          {metricasSel.map((id) => {
            const r = resumen?.porMetrica[id]
            const m = r?.meta
            if (!m) return null
            return (
              <div key={id} className="pdf-kpi">
                <span className="pdf-kpi-label">Prom. {m.label}</span>
                <span className="pdf-kpi-value">
                  {r.promedio != null ? r.promedio.toFixed(1) : '—'}
                  <small>{m.unidad}</small>
                </span>
                {r.min != null && (
                  <span className="pdf-kpi-sub">
                    {r.min.toFixed(1)} – {r.max.toFixed(1)} {m.unidad}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="pdf-section">
        <h2 className="pdf-section-title">Evolución temporal</h2>
        <SvgLineas datos={serie} metricasIds={metricasSel} />
        <Leyenda metricasIds={metricasSel} />
      </section>

      {barras.length > 0 && (
        <section className="pdf-section">
          <h2 className="pdf-section-title">Promedio por dispositivo</h2>
          <div className="pdf-barras">
            {barras.map((b) => {
              const max = Math.max(...barras.map((x) => x.promedio), 1)
              const pct = (b.promedio / max) * 100
              const meta = ALI_METRICAS.find((m) => metricasSel.includes(m.id))
              return (
                <div key={b.device_id} className="pdf-barra-fila">
                  <span className="pdf-barra-nombre">{b.nombre}</span>
                  <div className="pdf-barra-track">
                    <div
                      className="pdf-barra-fill"
                      style={{
                        width: `${pct}%`,
                        background: meta?.color ?? '#a4c639',
                      }}
                    />
                  </div>
                  <span className="pdf-barra-valor">{b.promedio.toFixed(1)}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="pdf-section pdf-page-break">
        <h2 className="pdf-section-title">Detalle de lecturas</h2>
        <p className="pdf-muted pdf-tabla-nota">
          {filasTabla.length < lecturas.length
            ? `Mostrando ${filasTabla.length} de ${lecturas.length} registros.`
            : `${lecturas.length} registros en el periodo.`}
        </p>
        <table className="pdf-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Dispositivo</th>
              <th>Método</th>
              {metricas.map((m) => (
                <th key={m.id}>{m.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filasTabla.map((r) => (
              <tr key={r.id}>
                <td>{formatearFechaReporte(r.created_at)}</td>
                <td>{etiquetaDispositivo(r.device_id, nodos)}</td>
                <td>{r.metodo_captura === 'IOT' ? 'IoT' : 'OCR'}</td>
                {metricas.map((m) => (
                  <td key={m.id}>
                    {r[m.id] != null ? Number(r[m.id]).toFixed(1) : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="pdf-footer">
        <p>
          <strong>ALISAGRO</strong> · Tecnología que transforma el campo en información
        </p>
        <p className="pdf-footer-small">Documento generado automáticamente · Uso interno agrícola</p>
      </footer>
    </div>
  )
}
