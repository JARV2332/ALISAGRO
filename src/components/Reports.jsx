import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ALI_LIMITE_REPORTE,
  ALI_METRICAS,
  ALI_NODOS_FALLBACK,
  ALI_TABLA_LECTURAS,
  ALI_TABLA_NODOS,
} from '../lib/alisagroConfig.js'
import {
  calcularResumen,
  datosSerieTemporal,
  exportarCsv,
  finDelDia,
  formatearFechaReporte,
  etiquetaDispositivo,
  inicioDelDia,
  promediosPorDispositivo,
  rangoFechasPorDefecto,
} from '../lib/reportesUtils.js'
import { descargarReportePdf } from '../lib/exportarPdf.js'
import { supabase } from '../lib/supabaseClient.js'
import { GraficaBarrasDispositivos, GraficaLineas } from './ReportCharts.jsx'
import ReportPdfTemplate from './ReportPdfTemplate.jsx'
import { IconDownload, IconPdf, IconRefresh } from './Icons.jsx'

const METODOS_FILTRO = [
  { id: 'todos', label: 'Todos' },
  { id: 'IOT', label: 'IoT (sensores)' },
  { id: 'OCR_MANUAL', label: 'OCR / manual' },
]

function KpiCard({ titulo, valor, unidad, sub, color = 'text-lime' }) {
  return (
    <article className="report-kpi card p-4 sm:p-5">
      <p className="text-[10px] uppercase font-bold text-dark-muted tracking-wide">{titulo}</p>
      <p className={`mt-2 text-2xl sm:text-3xl font-display font-bold ${color}`}>
        {valor}
        {unidad && <span className="text-lg text-dark-muted font-sans ml-0.5">{unidad}</span>}
      </p>
      {sub && <p className="text-xs text-dark-muted mt-1">{sub}</p>}
    </article>
  )
}

export default function Reports() {
  const def = rangoFechasPorDefecto(7)
  const [fechaDesde, setFechaDesde] = useState(def.desde)
  const [fechaHasta, setFechaHasta] = useState(def.hasta)
  const [dispositivosSel, setDispositivosSel] = useState([])
  const [metricasSel, setMetricasSel] = useState(ALI_METRICAS.map((m) => m.id))
  const [metodoFiltro, setMetodoFiltro] = useState('todos')
  const [nodos, setNodos] = useState({})
  const [lecturas, setLecturas] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [generado, setGenerado] = useState(false)
  const [metricaBarras, setMetricaBarras] = useState('humedad_suelo')
  const [exportandoPdf, setExportandoPdf] = useState(false)
  const pdfRef = useRef(null)

  const cargarNodos = useCallback(async () => {
    const mapa = { ...ALI_NODOS_FALLBACK }
    const { data } = await supabase.from(ALI_TABLA_NODOS).select('*').eq('activo', true)
    if (data?.length) {
      for (const n of data) mapa[n.device_id] = n
    }
    setNodos(mapa)
    setDispositivosSel((prev) => (prev.length ? prev : Object.keys(mapa)))
  }, [])

  useEffect(() => {
    cargarNodos()
  }, [cargarNodos])

  const toggleDispositivo = (id) => {
    setDispositivosSel((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    )
  }

  const toggleMetrica = (id) => {
    setMetricasSel((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  const seleccionarTodosDispositivos = () => setDispositivosSel(Object.keys(nodos))
  const limpiarDispositivos = () => setDispositivosSel([])

  const generarReporte = async () => {
    setCargando(true)
    setError('')
    setGenerado(false)

    try {
      if (!dispositivosSel.length) {
        throw new Error('Seleccione al menos un dispositivo o nodo.')
      }
      if (!metricasSel.length) {
        throw new Error('Seleccione al menos una métrica / sensor.')
      }

      let query = supabase
        .from(ALI_TABLA_LECTURAS)
        .select('*')
        .gte('created_at', inicioDelDia(fechaDesde))
        .lte('created_at', finDelDia(fechaHasta))
        .in('device_id', dispositivosSel)
        .order('created_at', { ascending: true })
        .limit(ALI_LIMITE_REPORTE)

      if (metodoFiltro !== 'todos') {
        query = query.eq('metodo_captura', metodoFiltro)
      }

      const { data, error: errSupa } = await query
      if (errSupa) throw errSupa

      setLecturas(data ?? [])
      setGenerado(true)
    } catch (e) {
      setError(e?.message ?? 'Error al cargar datos')
      setLecturas([])
    } finally {
      setCargando(false)
    }
  }

  const resumen = useMemo(
    () => (generado ? calcularResumen(lecturas, metricasSel) : null),
    [generado, lecturas, metricasSel]
  )

  const serie = useMemo(
    () => (generado ? datosSerieTemporal(lecturas, metricasSel, nodos) : []),
    [generado, lecturas, metricasSel, nodos]
  )

  const barras = useMemo(
    () =>
      generado && metricaBarras
        ? promediosPorDispositivo(lecturas, metricaBarras, nodos)
        : [],
    [generado, lecturas, metricaBarras, nodos]
  )

  const listaNodos = Object.entries(nodos)

  const metodoLabel = METODOS_FILTRO.find((m) => m.id === metodoFiltro)?.label ?? 'Todos'
  const dispositivosEtiquetas = dispositivosSel.map((id) => etiquetaDispositivo(id, nodos))

  const exportarPdf = async () => {
    if (!pdfRef.current || !lecturas.length) return
    setExportandoPdf(true)
    setError('')
    try {
      const nombre = `alisagro-reporte-${fechaDesde}-${fechaHasta}.pdf`
      await descargarReportePdf(pdfRef.current, nombre)
    } catch (e) {
      setError(e?.message ?? 'No se pudo generar el PDF')
    } finally {
      setExportandoPdf(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">Reportes y métricas</h2>
        <p className="text-dark-muted mt-2 text-sm max-w-2xl">
          Filtre por fechas, dispositivos y sensores. Genere gráficas, resúmenes y exporte CSV para
          llevar el control del cultivo.
        </p>
      </div>

      <section className="card p-5 sm:p-6 space-y-5 ring-1 ring-lime/15">
        <h3 className="section-head text-white font-bold">Filtros del reporte</h3>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="block">
            <span className="text-xs font-bold text-lime/80 uppercase">Desde</span>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="input-field mt-1 w-full"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-lime/80 uppercase">Hasta</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="input-field mt-1 w-full"
            />
          </label>
          <label className="block sm:col-span-2 lg:col-span-1">
            <span className="text-xs font-bold text-lime/80 uppercase">Origen de dato</span>
            <select
              value={metodoFiltro}
              onChange={(e) => setMetodoFiltro(e.target.value)}
              className="input-field mt-1 w-full"
            >
              {METODOS_FILTRO.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-lime/80 uppercase">Dispositivos / nodos</span>
              <div className="flex gap-2 text-[11px]">
                <button type="button" onClick={seleccionarTodosDispositivos} className="text-lime hover:underline">
                  Todos
                </button>
                <button type="button" onClick={limpiarDispositivos} className="text-dark-muted hover:underline">
                  Ninguno
                </button>
              </div>
            </div>
            <div className="report-filtros-grid rounded-xl border border-dark-border bg-dark-elevated p-3 max-h-36 overflow-y-auto">
              {listaNodos.map(([id, n]) => (
                <label key={id} className="report-check flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dispositivosSel.includes(id)}
                    onChange={() => toggleDispositivo(id)}
                    className="mt-0.5 accent-lime"
                  />
                  <span className="text-sm text-white leading-tight">
                    {n.nombre}
                    <span className="block text-[10px] text-dark-muted font-mono">{id}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-bold text-lime/80 uppercase block mb-2">Sensores / métricas</span>
            <div className="report-filtros-grid rounded-xl border border-dark-border bg-dark-elevated p-3">
              {ALI_METRICAS.map((m) => (
                <label key={m.id} className="report-check flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={metricasSel.includes(m.id)}
                    onChange={() => toggleMetrica(m.id)}
                    className="accent-lime"
                  />
                  <span className="text-sm text-white flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                    {m.label} ({m.unidad})
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="button"
            onClick={generarReporte}
            disabled={cargando}
            className="btn-primary"
          >
            <IconRefresh className={`w-5 h-5 ${cargando ? 'animate-spin' : ''}`} />
            {cargando ? 'Generando…' : 'Generar reporte'}
          </button>
          {generado && lecturas.length > 0 && (
            <>
              <button
                type="button"
                onClick={exportarPdf}
                disabled={exportandoPdf}
                className="btn-secondary"
              >
                <IconPdf className="w-5 h-5" />
                {exportandoPdf ? 'Generando PDF…' : 'Exportar PDF'}
              </button>
              <button
                type="button"
                onClick={() => exportarCsv(lecturas, nodos)}
                className="btn-secondary"
              >
                <IconDownload className="w-5 h-5" />
                Exportar CSV
              </button>
            </>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            {error}
          </p>
        )}
      </section>

      {generado && (
        <>
          <section className="space-y-3">
            <h3 className="font-bold text-white text-sm px-1">
              Resumen · {resumen?.total ?? 0} lecturas en el periodo
            </h3>
            <div className="report-kpi-grid">
              <KpiCard titulo="Registros" valor={resumen?.total ?? 0} sub="En el rango filtrado" />
              {metricasSel.map((id) => {
                const r = resumen?.porMetrica[id]
                const m = r?.meta
                if (!m) return null
                return (
                  <KpiCard
                    key={id}
                    titulo={`Prom. ${m.label}`}
                    valor={r.promedio != null ? r.promedio.toFixed(1) : '—'}
                    unidad={m.unidad}
                    sub={
                      r.min != null
                        ? `Min ${r.min.toFixed(1)} · Max ${r.max.toFixed(1)}`
                        : 'Sin valores'
                    }
                    color="text-white"
                  />
                )
              })}
            </div>
          </section>

          <section className="card p-5 sm:p-6 space-y-4">
            <h3 className="section-head text-white font-bold">Evolución en el tiempo</h3>
            <GraficaLineas datos={serie} metricasActivas={metricasSel} />
          </section>

          <section className="card p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="section-head text-white font-bold mb-0">Promedio por dispositivo</h3>
              <select
                value={metricaBarras}
                onChange={(e) => setMetricaBarras(e.target.value)}
                className="input-field text-sm py-2 max-w-[220px]"
              >
                {ALI_METRICAS.filter((m) => metricasSel.includes(m.id)).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <GraficaBarrasDispositivos datos={barras} metricaId={metricaBarras} />
          </section>

          <section className="card overflow-hidden ring-1 ring-dark-border">
            <div className="section-head px-5 py-4 border-b border-dark-border">
              <h3 className="font-bold text-white">Detalle de lecturas</h3>
              <p className="text-xs text-dark-muted mt-1">
                Máximo {ALI_LIMITE_REPORTE} registros por consulta
              </p>
            </div>
            {lecturas.length === 0 ? (
              <p className="p-8 text-center text-dark-muted text-sm">
                No hay lecturas con estos filtros. Amplíe fechas o dispositivos.
              </p>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="table-agri w-full text-sm">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Dispositivo</th>
                        <th>Método</th>
                        {ALI_METRICAS.map((m) => (
                          <th key={m.id}>{m.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...lecturas].reverse().slice(0, 100).map((r) => (
                        <tr key={r.id}>
                          <td className="whitespace-nowrap">{formatearFechaReporte(r.created_at)}</td>
                          <td>{etiquetaDispositivo(r.device_id, nodos)}</td>
                          <td>
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                r.metodo_captura === 'IOT'
                                  ? 'bg-lime/20 text-lime'
                                  : 'bg-amber-500/20 text-amber-200'
                              }`}
                            >
                              {r.metodo_captura === 'IOT' ? 'IoT' : 'OCR'}
                            </span>
                          </td>
                          {ALI_METRICAS.map((m) => (
                            <td key={m.id}>
                              {r[m.id] != null ? `${Number(r[m.id]).toFixed(1)}${m.unidad}` : '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden p-4 space-y-3 max-h-[420px] overflow-y-auto">
                  {[...lecturas].reverse().slice(0, 50).map((r) => (
                    <article
                      key={r.id}
                      className="rounded-xl border border-dark-border bg-dark-elevated p-4 text-sm"
                    >
                      <p className="text-white font-semibold">{formatearFechaReporte(r.created_at)}</p>
                      <p className="text-xs text-dark-muted mt-0.5">
                        {etiquetaDispositivo(r.device_id, nodos)}
                      </p>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        {ALI_METRICAS.filter((m) => metricasSel.includes(m.id)).map((m) => (
                          <div key={m.id}>
                            <dt className="text-dark-muted">{m.label}</dt>
                            <dd className="font-bold text-white">
                              {r[m.id] != null ? `${Number(r[m.id]).toFixed(1)} ${m.unidad}` : '—'}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </article>
                  ))}
                </div>
                {lecturas.length > 100 && (
                  <p className="text-xs text-dark-muted text-center py-3 border-t border-dark-border">
                    Tabla: primeros 100 de {lecturas.length}. Exporte CSV para el listado completo.
                  </p>
                )}
              </>
            )}
          </section>
        </>
      )}

      {!generado && !cargando && (
        <p className="text-center text-sm text-dark-muted py-8">
          Configure filtros y pulse <strong className="text-lime">Generar reporte</strong>.
        </p>
      )}

      {generado && lecturas.length > 0 && (
        <div className="pdf-report-root" aria-hidden>
          <div ref={pdfRef}>
            <ReportPdfTemplate
              fechaDesde={fechaDesde}
              fechaHasta={fechaHasta}
              dispositivosEtiquetas={dispositivosEtiquetas}
              metricasSel={metricasSel}
              metodoLabel={metodoLabel}
              resumen={resumen}
              serie={serie}
              barras={barras}
              lecturas={lecturas}
              nodos={nodos}
            />
          </div>
        </div>
      )}
    </div>
  )
}
