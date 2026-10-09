import { useCallback, useEffect, useMemo, useState } from 'react'
import { ALI_NODOS_FALLBACK, ALI_TABLA_DEMO_AWS, ALI_TABLA_FOTOS_AWS } from '../lib/alisagroConfig.js'
import { supabase } from '../lib/supabaseClient.js'
import {
  IconCloud,
  IconDroplet,
  IconLogo,
  IconRefresh,
  IconSignal,
  IconSun,
  IconThermometer,
} from './Icons.jsx'

const UMBRAL_SUELO_SECO = 30
const LIMITE = 12

const PASOS = [
  {
    n: '1',
    titulo: 'La parcela',
    texto: 'El suelo y el aire se miden ahí: humedad y temperatura.',
  },
  {
    n: '2',
    titulo: 'El Wemos',
    texto: 'El microcontrolador toma la lectura y la envía por Wi-Fi.',
  },
  {
    n: '3',
    titulo: 'AWS',
    texto: 'IoT Core la recibe. Una función la revisa y la entrega.',
  },
  {
    n: '4',
    titulo: 'Supabase',
    texto: 'Se guarda en la tabla de esta charla, aparte de las lecturas reales.',
  },
  {
    n: '5',
    titulo: 'Esta pantalla',
    texto: 'Aquí se lee qué está pasando, con hora.',
  },
]

function formatearHora(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-GT', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

function formatearFecha(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const fecha = new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    month: 'short',
  }).format(d)
  return `${fecha} · ${formatearHora(iso)}`
}

function formatearNum(valor, unidad = '') {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) return '—'
  return `${Number(valor).toFixed(1)}${unidad}`
}

function sueloDe(valor) {
  const h = Number(valor)
  if (!Number.isFinite(h)) {
    return { etiqueta: 'Sin dato de suelo', tono: 'text-dark-muted', barra: 'bg-dark-muted' }
  }
  if (h < UMBRAL_SUELO_SECO) {
    return { etiqueta: 'Suelo seco', tono: 'text-amber-200', barra: 'bg-amber-400' }
  }
  if (h <= 70) {
    return { etiqueta: 'Suelo en rango', tono: 'text-lime', barra: 'bg-lime' }
  }
  return { etiqueta: 'Suelo muy húmedo', tono: 'text-sky-200', barra: 'bg-sky-400' }
}

function intervalosSecos(filas) {
  const orden = [...filas].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  const intervalos = []
  let abierto = null
  for (const fila of orden) {
    const h = Number(fila.humedad_suelo)
    const seca = Number.isFinite(h) && h < UMBRAL_SUELO_SECO
    if (seca && !abierto) {
      abierto = { desde: fila.created_at, hasta: fila.created_at }
    } else if (seca && abierto) {
      abierto.hasta = fila.created_at
    } else if (!seca && abierto) {
      intervalos.push(abierto)
      abierto = null
    }
  }
  if (abierto) intervalos.push({ ...abierto, sigue: true })
  return intervalos
}

function estadoNodo(iso, ahora) {
  const edad = iso ? ahora - new Date(iso).getTime() : Number.POSITIVE_INFINITY
  if (edad <= 3 * 60 * 1000) return { etiqueta: 'En línea', clase: 'text-lime' }
  return { etiqueta: 'Sin señal reciente', clase: 'text-amber-200' }
}

export default function CharlaAws() {
  const [filas, setFilas] = useState([])
  const [fotos, setFotos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [avisoFoto, setAvisoFoto] = useState(null)
  const [enVivo, setEnVivo] = useState(false)
  const [ahora, setAhora] = useState(() => Date.now())

  const cargarFotos = useCallback(async () => {
    const { data, error: err } = await supabase
      .from(ALI_TABLA_FOTOS_AWS)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(6)
    if (err) {
      setAvisoFoto(err.message)
      return
    }
    setAvisoFoto(null)
    setFotos(data ?? [])
  }, [])

  const cargar = useCallback(async () => {
    setError(null)
    const { data, error: err } = await supabase
      .from(ALI_TABLA_DEMO_AWS)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(LIMITE)

    if (err) {
      setError(err.message)
      setCargando(false)
      return
    }
    setFilas(data ?? [])
    setCargando(false)
    cargarFotos()
  }, [cargarFotos])

  useEffect(() => {
    const titulo = document.title
    document.title = 'ALISAGRO | Charla AWS'
    return () => {
      document.title = titulo
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const canal = supabase
      .channel('alisagro-charla-aws')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: ALI_TABLA_DEMO_AWS },
        (payload) => {
          if (!payload.new) return
          setFilas((prev) => {
            const sinDuplicado = prev.filter((fila) => fila.id !== payload.new.id)
            return [payload.new, ...sinDuplicado].slice(0, LIMITE)
          })
        }
      )
      .subscribe((status) => setEnVivo(status === 'SUBSCRIBED'))

    const canalFotos = supabase
      .channel('alisagro-charla-fotos')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: ALI_TABLA_FOTOS_AWS },
        (payload) => {
          if (!payload.new) return
          setFotos((prev) => {
            const sinDuplicado = prev.filter((fila) => fila.id !== payload.new.id)
            return [payload.new, ...sinDuplicado].slice(0, 6)
          })
          setAvisoFoto(null)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
      supabase.removeChannel(canalFotos)
    }
  }, [])

  const ultima = filas[0] ?? null
  const foto = fotos[0] ?? null
  const nodo = ultima ? ALI_NODOS_FALLBACK[ultima.device_id] : null
  const suelo = sueloDe(ultima?.humedad_suelo)
  const senal = estadoNodo(ultima?.created_at, ahora)
  const bitacora = useMemo(() => intervalosSecos(filas), [filas])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-dark-border bg-dark">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-dark-panel ring-1 ring-lime/30">
              <IconLogo className="w-11 h-11 text-lime" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-lime">
                ALISAGRO / aws
              </p>
              <h1 className="font-display text-3xl sm:text-5xl font-bold text-white leading-none mt-2">
                De la parcela a esta pantalla
              </h1>
              <p className="text-dark-muted text-base sm:text-lg mt-3 max-w-xl leading-relaxed">
                Los sensores dicen qué está pasando. La Raspberry muestra qué se ve.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <a href="/community-day" className="text-sm font-semibold text-lime hover:underline">
              Modo presentación
            </a>
            <a href="/" className="text-sm font-semibold text-white/80 hover:text-lime">
              Volver al monitoreo
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        <section aria-label="Recorrido de la lectura">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
            Cómo llega una lectura
          </h2>
          <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {PASOS.map((paso) => (
              <li key={paso.n} className="card p-4 sm:p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lime text-dark text-sm font-bold">
                  {paso.n}
                </span>
                <p className="mt-4 font-display text-lg font-bold text-white">{paso.titulo}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/80">{paso.texto}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-4 lg:grid-cols-2" aria-label="Para qué está cada parte">
          <article className="card p-6 sm:p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-lime">Sensores</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-2">
              Qué está pasando
            </h2>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-white/85">
              Humedad del suelo, temperatura y humedad del aire. Con la hora de cada lectura se
              puede decir desde cuándo el suelo está seco.
            </p>
          </article>
          <article className="card p-6 sm:p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-lime">Raspberry Pi</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-2">
              Qué se está viendo
            </h2>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-white/85">
              La cámara toma la foto en la parcela. Verde, amarillo y seco son el color de esa
              imagen, no un diagnóstico. La foto queda en S3 y se ve aquí abajo.
            </p>
          </article>
        </section>

        <section className="space-y-4" aria-label="Foto de la planta">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
              Lo que está viendo la Pi
            </h2>
            <p className="text-sm text-dark-muted mt-1">
              La Raspberry envía la foto a S3. Esta pantalla la muestra con la hora.
            </p>
          </div>
          {avisoFoto && (
            <div className="card p-6 text-amber-200">
              La foto todavía no se puede leer. En Supabase corre el SQL{' '}
              <span className="font-bold">008_ali_fotos_aws_demo.sql</span>.
            </div>
          )}
          {!avisoFoto && !foto && (
            <div className="card p-8 text-dark-muted">
              Todavía no llega una foto. En la vista de la planta, pulsa «Enviar foto a AWS».
            </div>
          )}
          {foto && (
            <article className="card overflow-hidden">
              <img
                src={foto.url}
                alt="Foto de la planta enviada por la Raspberry Pi"
                className="w-full max-h-[520px] object-contain bg-black"
              />
              <div className="grid gap-4 p-5 sm:grid-cols-5 sm:p-6">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-dark-muted">Hora</p>
                  <p className="mt-1 font-display text-xl font-bold text-white">{formatearFecha(foto.created_at)}</p>
                </div>
                {[
                  ['Cobertura', foto.cobertura],
                  ['Verde', foto.verde],
                  ['Amarillo', foto.amarillo],
                  ['Seco visual', foto.seco],
                ].map(([nombre, valor]) => (
                  <div key={nombre}>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-dark-muted">{nombre}</p>
                    <p className="mt-1 font-display text-xl font-bold text-white">{formatearNum(valor, '%')}</p>
                  </div>
                ))}
              </div>
            </article>
          )}
        </section>

        <section className="space-y-4" aria-label="Lectura de la demo">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                Lecturas de la charla
              </h2>
              <p className="text-sm text-dark-muted mt-1">
                Tabla {ALI_TABLA_DEMO_AWS}. El inicio de ALISAGRO no la usa.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-2 text-sm font-bold ${enVivo ? 'text-lime' : 'text-dark-muted'}`}>
                <IconSignal className={`w-4 h-4 ${enVivo ? 'animate-pulse' : ''}`} />
                {enVivo ? 'En vivo' : 'Conectando'}
              </span>
              <button type="button" onClick={cargar} className="btn-secondary">
                <IconRefresh />
                Actualizar
              </button>
            </div>
          </div>

          {cargando && (
            <div className="card py-16 text-center text-dark-muted">Cargando lecturas…</div>
          )}

          {error && (
            <div className="rounded-2xl bg-red-500/10 border border-red-500/40 px-5 py-4">
              <p className="font-semibold text-red-200">No pude leer la tabla de la demo</p>
              <p className="text-sm text-red-300/90 mt-1">{error}</p>
            </div>
          )}

          {!cargando && !error && !ultima && (
            <div className="card p-10 text-center">
              <p className="font-display text-2xl font-bold text-white">Todavía no hay lecturas</p>
              <p className="text-dark-muted mt-3 max-w-md mx-auto leading-relaxed">
                Cuando el Wemos envíe, o cuando llegue una prueba, aparece aquí.
              </p>
            </div>
          )}

          {ultima && (
            <>
              <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                <article className="card p-6 sm:p-8">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-lime">
                        Última lectura
                      </p>
                      <p className="font-display text-2xl font-bold text-white mt-2">
                        {nodo?.nombre ?? ultima.device_id}
                      </p>
                      <p className="text-dark-muted mt-1">
                        {nodo?.parcela ?? 'Nodo de la charla'} · {formatearFecha(ultima.created_at)}
                      </p>
                    </div>
                    <p className={`text-sm font-bold ${senal.clase}`}>{senal.etiqueta}</p>
                  </div>

                  <div className="mt-8">
                    <p className="text-sm font-semibold text-white/70">Humedad del suelo</p>
                    <p className="font-display text-6xl sm:text-7xl font-bold text-white tracking-tight mt-1">
                      {formatearNum(ultima.humedad_suelo)}
                      <span className="text-3xl text-dark-muted ml-1">%</span>
                    </p>
                    <p className={`mt-3 text-lg font-bold ${suelo.tono}`}>{suelo.etiqueta}</p>
                    <div className="mt-4 h-2 rounded-full bg-dark overflow-hidden ring-1 ring-dark-border">
                      <div
                        className={`h-full rounded-full ${suelo.barra}`}
                        style={{
                          width: `${Math.min(100, Math.max(0, Number(ultima.humedad_suelo) || 0))}%`,
                        }}
                      />
                    </div>
                  </div>

                  <dl className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl bg-dark px-4 py-3 ring-1 ring-dark-border">
                      <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-dark-muted">
                        <IconThermometer className="w-4 h-4" /> Suelo
                      </dt>
                      <dd className="mt-2 text-2xl font-bold text-white">
                        {formatearNum(ultima.temp_suelo, '°C')}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-dark px-4 py-3 ring-1 ring-dark-border">
                      <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-dark-muted">
                        <IconSun className="w-4 h-4" /> Ambiente
                      </dt>
                      <dd className="mt-2 text-2xl font-bold text-white">
                        {formatearNum(ultima.temp_ambiente, '°C')}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-dark px-4 py-3 ring-1 ring-dark-border">
                      <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-dark-muted">
                        <IconCloud className="w-4 h-4" /> Humedad aire
                      </dt>
                      <dd className="mt-2 text-2xl font-bold text-white">
                        {formatearNum(ultima.humedad_ambiente, '%')}
                      </dd>
                    </div>
                  </dl>
                </article>

                <article className="card p-6 sm:p-8">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-lime">
                    Bitácora del suelo
                  </p>
                  <h3 className="font-display text-2xl font-bold text-white mt-2">
                    Cuándo estuvo seco
                  </h3>
                  {bitacora.length === 0 ? (
                    <p className="mt-5 text-base leading-relaxed text-white/85">
                      En estas lecturas el suelo no bajó de {UMBRAL_SUELO_SECO} %. Cuando se
                      mantenga seco, aquí queda la hora de inicio y la hora de fin.
                    </p>
                  ) : (
                    <ul className="mt-5 space-y-3">
                      {bitacora.map((tramo) => (
                        <li
                          key={`${tramo.desde}-${tramo.hasta}`}
                          className="rounded-xl bg-dark px-4 py-3 ring-1 ring-dark-border"
                        >
                          <p className="flex items-center gap-2 font-bold text-amber-200">
                            <IconDroplet className="w-4 h-4" />
                            Suelo seco
                          </p>
                          <p className="mt-1 text-white leading-relaxed">
                            Desde {formatearHora(tramo.desde)}
                            {tramo.sigue
                              ? ' y sigue así.'
                              : ` hasta ${formatearHora(tramo.hasta)}.`}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-6 text-sm leading-relaxed text-dark-muted">
                    La sequedad la marca el sensor. La Raspberry deja ver la planta para
                    acompañar ese dato.
                  </p>
                </article>
              </div>

              <section className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-dark-border">
                  <h3 className="font-display text-lg font-bold text-white">Historial</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="table-agri w-full">
                    <thead className="bg-dark">
                      <tr>
                        <th>Hora</th>
                        <th>Nodo</th>
                        <th className="text-right">H. suelo</th>
                        <th className="text-right">T. suelo</th>
                        <th className="text-right">T. amb.</th>
                        <th className="text-right">H. amb.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filas.map((fila, i) => (
                        <tr key={fila.id} className={i === 0 ? 'bg-lime/5' : ''}>
                          <td className="whitespace-nowrap text-white/80">
                            {formatearFecha(fila.created_at)}
                          </td>
                          <td className="font-semibold text-white">
                            {ALI_NODOS_FALLBACK[fila.device_id]?.nombre ?? fila.device_id}
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </section>
      </main>

      <footer className="mt-auto border-t border-dark-border bg-dark-panel py-5">
        <p className="text-center text-xs text-dark-muted font-medium">
          <span className="text-white font-bold">ALISA</span>
          <span className="text-lime font-bold">GRO</span>
          {' · '}
          Pantalla de la charla · las lecturas de producción siguen en el inicio
        </p>
      </footer>
    </div>
  )
}
