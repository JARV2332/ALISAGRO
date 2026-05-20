import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ALI_NODOS_FALLBACK,
  ALI_TABLA_LECTURAS,
  ALI_TABLA_NODOS,
} from '../lib/alisagroConfig.js'
import { supabase } from '../lib/supabaseClient.js'
import {
  IconCloud,
  IconDroplet,
  IconField,
  IconLeaf,
  IconMapPin,
  IconRefresh,
  IconSignal,
  IconSun,
  IconThermometer,
} from './Icons.jsx'

const TABLA = ALI_TABLA_LECTURAS
const LIMITE_HISTORIAL = 10

function formatearFecha(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(iso))
}

function formatearNum(valor, unidad = '') {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) return '—'
  return `${Number(valor).toFixed(1)}${unidad}`
}

function estadoHumedadSuelo(porcentaje) {
  const h = Number(porcentaje)
  if (Number.isNaN(h)) {
    return {
      etiqueta: 'Sin dato',
      card: 'ring-1 ring-dark-border',
      barra: 'bg-dark-muted',
      iconWrap: 'bg-dark-elevated text-dark-muted',
      pill: 'bg-dark-elevated text-dark-muted ring-1 ring-dark-border',
    }
  }
  if (h < 30) {
    return {
      etiqueta: 'Estrés hídrico',
      card: 'ring-2 ring-red-500/50 bg-red-500/5',
      barra: 'bg-red-500',
      iconWrap: 'bg-red-500/15 text-red-400',
      pill: 'bg-red-500/20 text-red-300 ring-1 ring-red-500/40',
    }
  }
  if (h <= 70) {
    return {
      etiqueta: 'Rango óptimo',
      card: 'ring-2 ring-lime/40 bg-lime/5',
      barra: 'bg-lime',
      iconWrap: 'bg-lime/15 text-lime',
      pill: 'bg-lime/20 text-lime ring-1 ring-lime/40',
    }
  }
  return {
    etiqueta: 'Suelo saturado',
    card: 'ring-2 ring-sky-500/40 bg-sky-500/5',
    barra: 'bg-sky-400',
    iconWrap: 'bg-sky-500/15 text-sky-300',
    pill: 'bg-sky-500/20 text-sky-200 ring-1 ring-sky-500/40',
  }
}

function BadgeMetodo({ metodo }) {
  const esIot = metodo === 'IOT'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
        esIot
          ? 'bg-lime text-dark'
          : 'bg-dark-elevated text-amber-300 ring-1 ring-amber-500/40'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${esIot ? 'bg-dark/40' : 'bg-amber-400'}`} />
      {esIot ? 'IoT' : 'OCR'}
    </span>
  )
}

function TarjetaMetrica({ titulo, valor, unidad, Icon, destacada = false, estado = null, className = '' }) {
  return (
    <article
      className={`metric-card card card-hover p-5 sm:p-6 relative overflow-hidden ${className} ${
        destacada && estado ? estado.card : ''
      }`}
    >
      {destacada && estado && (
        <div className={`absolute top-0 left-0 right-0 h-1 ${estado.barra}`} aria-hidden />
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-lime/70">
            {titulo}
          </p>
          <p className="metric-card__value text-white mt-2">
            {valor}
            <span className="text-lg font-semibold text-dark-muted ml-1">{unidad}</span>
          </p>
          {destacada && estado && (
            <span
              className={`inline-flex mt-3 rounded-full px-2.5 py-1 text-xs font-bold ${estado.pill}`}
            >
              {estado.etiqueta}
            </span>
          )}
        </div>
        <div
          className={`flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl ${
            destacada && estado ? estado.iconWrap : 'bg-dark-elevated text-lime ring-1 ring-dark-border'
          }`}
        >
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>
      {destacada && !Number.isNaN(Number(valor)) && valor !== '—' && (
        <div className="mt-4 h-2 rounded-full bg-dark overflow-hidden ring-1 ring-dark-border">
          <div
            className={`h-full rounded-full transition-all duration-700 ${estado?.barra ?? 'bg-dark-muted'}`}
            style={{ width: `${Math.min(100, Math.max(0, Number(valor)))}%` }}
          />
        </div>
      )}
    </article>
  )
}

function DatoUbicacion({ etiqueta, valor, icono: Icono, wide = false }) {
  if (!valor) return null
  return (
    <div className={`ficha-nodo-dato ${wide ? 'ficha-nodo-dato--wide' : ''}`}>
      <p className="ficha-nodo-dato__label">
        <span className="ficha-nodo-dato__icon">
          <Icono className="w-4 h-4" />
        </span>
        {etiqueta}
      </p>
      <p className="ficha-nodo-dato__value">{valor}</p>
    </div>
  )
}

function FichaNodo({ nodo, deviceId, metodo, ultimaLectura }) {
  if (!nodo && !deviceId) return null

  const nombre = nodo?.nombre ?? deviceId
  const parcela = nodo?.parcela
  const ubicacion = nodo?.ubicacion
  const finca = nodo?.finca
  const cultivo = nodo?.cultivo

  return (
    <section className="ficha-nodo" aria-label="Información del nodo">
      <div className="ficha-nodo__inner">
        <header className="ficha-nodo__header">
          <div className="ficha-nodo__avatar" aria-hidden>
            <IconMapPin className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>

          <div className="ficha-nodo__title-block">
            <div className="ficha-nodo__badges">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-lime/12 text-lime px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ring-lime/25">
                Nodo activo
              </span>
              {metodo && <BadgeMetodo metodo={metodo} />}
            </div>
            <h3 className="ficha-nodo__title">{nombre}</h3>
            {finca && <p className="ficha-nodo__finca">{finca}</p>}
            <p className="ficha-nodo__device">
              ID <strong>{deviceId}</strong>
            </p>
          </div>

          {ultimaLectura && (
            <div className="ficha-nodo__time">
              <span className="ficha-nodo__time-label">Última lectura</span>
              <time className="ficha-nodo__time-value" dateTime={ultimaLectura}>
                {formatearFecha(ultimaLectura)}
              </time>
            </div>
          )}
        </header>

        {(parcela || ubicacion || cultivo) && (
          <div className="ficha-nodo__grid">
            <DatoUbicacion etiqueta="Parcela / lote" valor={parcela} icono={IconField} />
            <DatoUbicacion etiqueta="Ubicación en campo" valor={ubicacion} icono={IconMapPin} />
            <DatoUbicacion etiqueta="Cultivo" valor={cultivo} icono={IconLeaf} wide />
          </div>
        )}
      </div>
    </section>
  )
}

function FilaHistorialMovil({ fila, esReciente, nodoPorDevice }) {
  const nodo = nodoPorDevice?.[fila.device_id]
  const etiquetaNodo = nodo?.parcela ?? nodo?.nombre ?? fila.device_id

  return (
    <article
      className={`lectura-historial-card rounded-2xl border p-4 sm:p-5 transition-colors ${
        esReciente
          ? 'border-lime/35 bg-lime/5 ring-1 ring-lime/20'
          : 'border-dark-border bg-dark-panel'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <time className="text-xs font-semibold text-dark-muted tabular-nums">
          {formatearFecha(fila.created_at)}
        </time>
        <BadgeMetodo metodo={fila.metodo_captura} />
      </div>
      <p className="text-sm font-semibold text-white/90 mb-3 truncate" title={etiquetaNodo}>
        {etiquetaNodo}
      </p>
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-dark-elevated/80 px-3 py-2.5 ring-1 ring-dark-border">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-dark-muted">H. suelo</dt>
          <dd className="text-lg font-bold tabular-nums text-lime mt-0.5">
            {formatearNum(fila.humedad_suelo, '%')}
          </dd>
        </div>
        <div className="rounded-xl bg-dark-elevated/80 px-3 py-2.5 ring-1 ring-dark-border">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-dark-muted">T. suelo</dt>
          <dd className="text-lg font-bold tabular-nums text-white mt-0.5">
            {formatearNum(fila.temp_suelo, '°C')}
          </dd>
        </div>
        <div className="rounded-xl bg-dark-elevated/80 px-3 py-2.5 ring-1 ring-dark-border">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-dark-muted">T. amb.</dt>
          <dd className="text-lg font-bold tabular-nums text-white/90 mt-0.5">
            {formatearNum(fila.temp_ambiente, '°C')}
          </dd>
        </div>
        <div className="rounded-xl bg-dark-elevated/80 px-3 py-2.5 ring-1 ring-dark-border">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-dark-muted">H. amb.</dt>
          <dd className="text-lg font-bold tabular-nums text-white/90 mt-0.5">
            {formatearNum(fila.humedad_ambiente, '%')}
          </dd>
        </div>
      </dl>
    </article>
  )
}

export default function Dashboard() {
  const [ultima, setUltima] = useState(null)
  const [historial, setHistorial] = useState([])
  const [nodoActivo, setNodoActivo] = useState(null)
  const [nodosMap, setNodosMap] = useState({})
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [conectadoRealtime, setConectadoRealtime] = useState(false)

  const resolverNodo = useCallback((deviceId, filaDb) => {
    if (filaDb) return filaDb
    if (!deviceId) return null
    return ALI_NODOS_FALLBACK[deviceId] ?? null
  }, [])

  const cargarNodo = useCallback(
    async (deviceId) => {
      if (!deviceId) {
        setNodoActivo(null)
        return
      }

      const fallback = resolverNodo(deviceId, null)
      const { data, error: errNodo } = await supabase
        .from(ALI_TABLA_NODOS)
        .select('device_id, nombre, parcela, ubicacion, finca, cultivo, notas')
        .eq('device_id', deviceId)
        .maybeSingle()

      if (errNodo) {
        setNodoActivo(fallback ? { device_id: deviceId, ...fallback } : null)
        return
      }

      setNodoActivo(
        data ? data : fallback ? { device_id: deviceId, ...fallback } : null
      )
    },
    [resolverNodo]
  )

  const cargarTodosNodos = useCallback(async () => {
    const { data, error: errNodo } = await supabase
      .from(ALI_TABLA_NODOS)
      .select('device_id, nombre, parcela, ubicacion, finca, cultivo')

    const mapa = { ...ALI_NODOS_FALLBACK }

    if (!errNodo && data?.length) {
      for (const fila of data) {
        mapa[fila.device_id] = fila
      }
    }

    setNodosMap(mapa)
  }, [])

  const aplicarLectura = useCallback((nuevaFila) => {
    setUltima(nuevaFila)
    setHistorial((prev) => {
      const sinDuplicado = prev.filter((r) => r.id !== nuevaFila.id)
      return [nuevaFila, ...sinDuplicado].slice(0, LIMITE_HISTORIAL)
    })
    if (nuevaFila.device_id) cargarNodo(nuevaFila.device_id)
  }, [cargarNodo])

  const cargarInicial = useCallback(async () => {
    setCargando(true)
    setError(null)

    const [{ data, error: err }, _] = await Promise.all([
      supabase
        .from(TABLA)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(LIMITE_HISTORIAL),
      cargarTodosNodos(),
    ])

    if (err) {
      setError(err.message)
      setCargando(false)
      return
    }

    const filas = data ?? []
    if (filas.length > 0) {
      setUltima(filas[0])
      setHistorial(filas)
      await cargarNodo(filas[0].device_id)
    } else {
      setUltima(null)
      setHistorial([])
      setNodoActivo(null)
    }
    setCargando(false)
  }, [cargarNodo, cargarTodosNodos])

  useEffect(() => {
    cargarInicial()
  }, [cargarInicial])

  useEffect(() => {
    const canal = supabase
      .channel('alisagro-lecturas-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: TABLA },
        (payload) => {
          if (payload.new) aplicarLectura(payload.new)
        }
      )
      .subscribe((status) => setConectadoRealtime(status === 'SUBSCRIBED'))

    return () => {
      supabase.removeChannel(canal)
    }
  }, [aplicarLectura])

  const estadoHum = useMemo(
    () => estadoHumedadSuelo(ultima?.humedad_suelo),
    [ultima?.humedad_suelo]
  )

  const nodoPorDevice = useMemo(() => {
    const mapa = {}
    for (const [id, datos] of Object.entries(nodosMap)) {
      mapa[id] = typeof datos === 'object' && datos.nombre ? datos : { nombre: id, ...datos }
    }
    return mapa
  }, [nodosMap])

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-4 border-dark-border" />
          <div className="absolute inset-0 w-14 h-14 rounded-full border-4 border-lime border-t-transparent animate-spin" />
        </div>
        <p className="mt-6 text-white font-semibold">Sincronizando lecturas del campo…</p>
        <p className="text-sm text-dark-muted mt-1">Conectando con Supabase</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-7">
      <div className="dashboard-toolbar">
        <div className="min-w-0">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
            Panel de monitoreo
          </h2>
          <p className="text-dark-muted mt-1 text-sm leading-relaxed">
            Lecturas en tiempo real · ubicación del nodo en la finca
          </p>
        </div>

        <div className="dashboard-actions">
          <span
            className={`badge-live ${conectadoRealtime ? 'badge-live--on' : 'badge-live--off'}`}
          >
            <IconSignal
              className={`w-3.5 h-3.5 ${conectadoRealtime ? 'animate-pulse' : ''}`}
            />
            {conectadoRealtime ? 'En vivo' : 'Conectando'}
          </span>
          <button type="button" onClick={cargarInicial} className="btn-secondary">
            <IconRefresh />
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-500/10 border border-red-500/40 px-5 py-4 flex gap-3">
          <span className="text-red-400 font-bold text-lg">!</span>
          <div>
            <p className="font-semibold text-red-200">Error de conexión</p>
            <p className="text-sm text-red-300/90 mt-1">{error}</p>
            <p className="text-xs text-dark-muted mt-2">
              Revisa .env, el script SQL y las políticas RLS en Supabase.
            </p>
          </div>
        </div>
      )}

      {!ultima && !error && (
        <div className="card p-12 sm:p-16 text-center border-dashed border-2 border-lime/30 bg-lime/5">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-lime/15 flex items-center justify-center text-lime mb-5 ring-1 ring-lime/30">
            <IconDroplet className="w-8 h-8" />
          </div>
          <p className="font-display text-xl font-bold text-white">Sin lecturas aún</p>
          <p className="text-dark-muted mt-2 max-w-sm mx-auto text-sm leading-relaxed">
            Enciende el nodo ESP32 o registra una captura OCR. Los datos aparecerán aquí al instante.
          </p>
        </div>
      )}

      {ultima && (
        <>
          <FichaNodo
            nodo={nodoActivo}
            deviceId={ultima.device_id}
            metodo={ultima.metodo_captura}
            ultimaLectura={ultima.created_at}
          />

          <section className="metrics-bento" aria-label="Métricas actuales">
            <TarjetaMetrica
              className="metrics-bento__hero"
              titulo="Humedad del suelo"
              valor={formatearNum(ultima.humedad_suelo)}
              unidad="%"
              Icon={IconDroplet}
              destacada
              estado={estadoHum}
            />
            <TarjetaMetrica
              titulo="Temperatura del suelo"
              valor={formatearNum(ultima.temp_suelo)}
              unidad="°C"
              Icon={IconThermometer}
            />
            <TarjetaMetrica
              titulo="Temperatura ambiente"
              valor={formatearNum(ultima.temp_ambiente)}
              unidad="°C"
              Icon={IconSun}
            />
            <TarjetaMetrica
              titulo="Humedad ambiente"
              valor={formatearNum(ultima.humedad_ambiente)}
              unidad="%"
              Icon={IconCloud}
            />
          </section>

          <section className="card overflow-hidden">
            <div className="section-head">
              <h3 className="font-display font-bold text-lg text-white">Historial reciente</h3>
              <p className="text-xs text-dark-muted mt-1">
                Últimas {LIMITE_HISTORIAL} lecturas por parcela y variables del campo
              </p>
            </div>

            <div className="lg:hidden p-4 sm:p-5 space-y-3">
              {historial.map((fila, i) => (
                <FilaHistorialMovil
                  key={fila.id}
                  fila={fila}
                  esReciente={i === 0}
                  nodoPorDevice={nodoPorDevice}
                />
              ))}
            </div>

            <div className="hidden lg:block overflow-x-auto">
              <table className="table-agri w-full">
                <thead className="bg-dark">
                  <tr>
                    <th>Fecha</th>
                    <th>Parcela / nodo</th>
                    <th>Origen</th>
                    <th className="text-right">H. suelo</th>
                    <th className="text-right">T. suelo</th>
                    <th className="text-right">T. amb.</th>
                    <th className="text-right">H. amb.</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((fila, i) => {
                    const nodo = nodoPorDevice[fila.device_id]
                    const etiqueta =
                      nodo?.parcela ?? nodo?.nombre ?? fila.device_id
                    return (
                      <tr key={fila.id} className={i === 0 ? 'bg-lime/5' : ''}>
                        <td className="whitespace-nowrap text-dark-muted font-medium">
                          {formatearFecha(fila.created_at)}
                        </td>
                        <td>
                          <span className="block font-semibold text-white/95">{etiqueta}</span>
                          {nodo?.ubicacion && (
                            <span className="block text-xs text-dark-muted mt-0.5 max-w-[220px] truncate">
                              {nodo.ubicacion}
                            </span>
                          )}
                        </td>
                        <td>
                          <BadgeMetodo metodo={fila.metodo_captura} />
                        </td>
                        <td className="text-right font-semibold tabular-nums text-lime">
                          {formatearNum(fila.humedad_suelo, '%')}
                        </td>
                        <td className="text-right tabular-nums text-white/80">
                          {formatearNum(fila.temp_suelo, '°C')}
                        </td>
                        <td className="text-right tabular-nums text-white/80">
                          {formatearNum(fila.temp_ambiente, '°C')}
                        </td>
                        <td className="text-right tabular-nums text-white/80">
                          {formatearNum(fila.humedad_ambiente, '%')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
