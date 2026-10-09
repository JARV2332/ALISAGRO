import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Cloud, Cpu, Database, Droplets, Monitor, NotebookPen, Sprout } from 'lucide-react'
import { ALI_NODOS_FALLBACK, ALI_TABLA_DEMO_AWS, ALI_TABLA_FOTOS_AWS } from '../lib/alisagroConfig.js'
import { supabase } from '../lib/supabaseClient.js'
import {
  IconCloud,
  IconDroplet,
  IconLogo,
  IconRefresh,
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
    Icono: Sprout,
  },
  {
    n: '2',
    titulo: 'El Wemos',
    texto: 'El microcontrolador toma la lectura y la envía por Wi-Fi.',
    Icono: Cpu,
  },
  {
    n: '3',
    titulo: 'AWS',
    texto: 'IoT Core la recibe. Una función la revisa y la entrega.',
    Icono: Cloud,
    aws: true,
  },
  {
    n: '4',
    titulo: 'Supabase',
    texto: 'Se guarda aparte de las lecturas reales del inicio.',
    Icono: Database,
  },
  {
    n: '5',
    titulo: 'Esta pantalla',
    texto: 'Aquí se lee qué está pasando, con hora.',
    Icono: Monitor,
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
  if (edad <= 3 * 60 * 1000) return { etiqueta: 'En línea', clase: 'text-lime', reciente: true }
  return { etiqueta: 'Sin señal reciente', clase: 'text-neutral-400', reciente: false }
}

function pielLectura(suelo, senal) {
  if (!senal.reciente) {
    return {
      borde: 'border-neutral-500/55',
      badge: 'bg-[#232323] text-neutral-300 ring-1 ring-neutral-500/40',
      barra: 'bg-neutral-500',
      brillo: 'shadow-[0_10px_28px_rgb(0_0_0/0.35)]',
    }
  }
  if (suelo.etiqueta === 'Suelo seco') {
    return {
      borde: 'border-amber-400/70',
      badge: 'bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/45',
      barra: 'bg-amber-400',
      brillo: 'shadow-[0_0_32px_rgb(245_158_11/0.2)]',
    }
  }
  if (suelo.etiqueta === 'Suelo muy húmedo') {
    return {
      borde: 'border-sky-400/55',
      badge: 'bg-sky-400/15 text-sky-100 ring-1 ring-sky-400/40',
      barra: 'bg-sky-400',
      brillo: 'shadow-[0_0_28px_rgb(56_189_248/0.16)]',
    }
  }
  return {
    borde: 'border-[#a4c639]/70',
    badge: 'bg-[#a4c639]/15 text-[#d4e68a] ring-1 ring-[#a4c639]/45',
    barra: 'bg-[#a4c639]',
    brillo: 'shadow-[0_0_36px_rgb(164_198_57/0.28)]',
  }
}

function analisisDe(valor) {
  const n = Number(valor)
  if (!Number.isFinite(n) || n === 0) return null
  return n
}

function useConteo(valor) {
  const [mostrado, setMostrado] = useState(0)
  useEffect(() => {
    if (!Number.isFinite(valor)) return undefined
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducir) {
      setMostrado(valor)
      return undefined
    }
    let marco = 0
    const inicio = performance.now()
    const tick = (ahora) => {
      const t = Math.min(1, (ahora - inicio) / 900)
      const eased = 1 - (1 - t) ** 3
      setMostrado(valor * eased)
      if (t < 1) marco = requestAnimationFrame(tick)
    }
    marco = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(marco)
  }, [valor])
  return mostrado
}

function Revelar({ children, className = '', retraso = 0 }) {
  const ref = useRef(null)
  const [visto, setVisto] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisto(true)
      return undefined
    }
    const obs = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return
        setVisto(true)
        obs.disconnect()
      },
      { threshold: 0.16 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      className={`${visto ? 'aws-visible' : 'aws-oculto'} ${className}`}
      style={{ animationDelay: `${retraso}ms` }}
    >
      {children}
    </div>
  )
}

function Numero({ valor, decimales = 1, className = '' }) {
  const n = Number(valor)
  const mostrado = useConteo(Number.isFinite(n) ? n : 0)
  if (!Number.isFinite(n)) return <span className={className}>—</span>
  return <span className={`tabular-nums ${className}`}>{mostrado.toFixed(decimales)}</span>
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
  const piel = pielLectura(suelo, senal)
  const sinAnalisis = foto
    ? [foto.cobertura, foto.verde, foto.amarillo, foto.seco].every((valor) => analisisDe(valor) == null)
    : true

  return (
    <div className="min-h-screen flex flex-col bg-[#121212]">
      <header className="relative overflow-hidden border-b border-white/10 bg-[#0e0e0e]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 80% at 15% 0%, rgb(164 198 57 / 0.18), transparent 55%), radial-gradient(ellipse 40% 50% at 90% 80%, rgb(255 153 0 / 0.08), transparent 60%)',
          }}
        />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1a1a1a] ring-1 ring-[#a4c639]/40 shadow-[0_0_24px_rgb(164_198_57/0.2)]">
                <IconLogo className="h-9 w-9 text-[#a4c639]" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#a4c639]">
                ALISAGRO / aws
              </p>
            </div>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[0.95] tracking-tight text-white sm:text-6xl">
              De la parcela a esta pantalla
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              Los sensores dicen qué está pasando. La Raspberry muestra qué se ve.
            </p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold">
              <a href="/community-day" className="text-[#a4c639] hover:underline">
                Modo presentación
              </a>
              <a href="/" className="text-white/80 hover:text-[#a4c639]">
                Volver al monitoreo
              </a>
            </div>
          </div>
          <Parcela />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-8 sm:px-6 sm:py-10">
        <Revelar>
          <section aria-label="Recorrido de la lectura">
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Cómo llega una lectura</h2>
            <p className="mt-1 text-sm text-white/55">El dato sale de la parcela y llega hasta aquí.</p>
            <ol className="relative mt-8 flex flex-col gap-4 md:flex-row md:items-stretch md:gap-3">
              <div className="pointer-events-none absolute bottom-4 left-[18px] top-4 w-px bg-white/15 md:hidden" aria-hidden>
                <span className="aws-punto-y absolute -left-[4px] h-2.5 w-2.5 rounded-full bg-[#a4c639] shadow-[0_0_10px_#a4c639]" />
              </div>
              <div className="pointer-events-none absolute left-[8%] right-[8%] top-7 hidden h-px bg-white/15 md:block" aria-hidden>
                <span className="aws-punto-x absolute -top-[4px] h-2.5 w-2.5 rounded-full bg-[#a4c639] shadow-[0_0_10px_#a4c639]" />
              </div>
              {PASOS.map((paso) => (
                <li
                  key={paso.n}
                  className={`relative z-10 ml-10 flex flex-1 gap-3 rounded-2xl border bg-[#1a1a1a] p-4 shadow-[0_8px_24px_rgb(0_0_0/0.28)] transition duration-300 hover:-translate-y-0.5 md:ml-0 md:flex-col md:items-start ${
                    paso.aws
                      ? 'border-[#FF9900]/70 shadow-[0_0_24px_rgb(255_153_0/0.16)]'
                      : 'border-white/10 hover:border-[#a4c639]/40 hover:shadow-[0_12px_28px_rgb(0_0_0/0.4)]'
                  }`}
                >
                  <span
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
                      paso.aws ? 'bg-[#FF9900]/15 text-[#FF9900] ring-1 ring-[#FF9900]/50' : 'bg-[#232323] text-[#a4c639] ring-1 ring-white/10'
                    }`}
                  >
                    <paso.Icono className="h-5 w-5" strokeWidth={2.25} />
                  </span>
                  <div>
                    <p className={`text-[11px] font-bold uppercase tracking-[0.16em] ${paso.aws ? 'text-[#FF9900]' : 'text-white/40'}`}>
                      {paso.aws ? 'AWS' : `Paso ${paso.n}`}
                    </p>
                    <p className="mt-1 font-display text-lg font-bold text-white">{paso.titulo}</p>
                    <p className="mt-1 text-sm leading-snug text-white/75">{paso.texto}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </Revelar>

        <Revelar retraso={80}>
          <section className="grid items-start gap-4 md:grid-cols-2" aria-label="Para qué está cada parte">
            <article className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-5 shadow-[0_8px_24px_rgb(0_0_0/0.28)] transition duration-300 hover:-translate-y-0.5 hover:border-[#a4c639]/35">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#232323] text-[#a4c639] ring-1 ring-white/10">
                  <Droplets className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#a4c639]">Sensores</p>
                  <h2 className="font-display text-2xl font-bold text-white">Qué está pasando</h2>
                </div>
              </div>
              <p className="mt-3 text-base leading-relaxed text-white/80">
                Humedad del suelo, temperatura y humedad del aire. Con la hora de cada lectura se puede decir desde cuándo el suelo está seco.
              </p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-5 shadow-[0_8px_24px_rgb(0_0_0/0.28)] transition duration-300 hover:-translate-y-0.5 hover:border-[#a4c639]/35">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#232323] text-[#a4c639] ring-1 ring-white/10">
                  <Camera className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#a4c639]">Raspberry Pi</p>
                  <h2 className="font-display text-2xl font-bold text-white">Qué se está viendo</h2>
                </div>
              </div>
              <p className="mt-3 text-base leading-relaxed text-white/80">
                La cámara toma la foto en la parcela. Verde, amarillo y seco son el color de esa imagen, no un diagnóstico. La foto queda en S3 y se ve aquí.
              </p>
            </article>
          </section>
        </Revelar>

        <Revelar retraso={40}>
          <section className="space-y-4" aria-label="Foto de la planta">
            <div>
              <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Lo que está viendo la Pi</h2>
              <p className="mt-1 text-sm text-white/55">La Raspberry envía la foto a S3. Esta pantalla la muestra con la hora.</p>
            </div>
            {avisoFoto && (
              <div className="rounded-2xl border border-amber-400/40 bg-[#1a1a1a] p-6 text-amber-200">
                La foto todavía no se puede leer. En Supabase corre el SQL{' '}
                <span className="font-bold">008_ali_fotos_aws_demo.sql</span>.
              </div>
            )}
            {!avisoFoto && !foto && (
              <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-8 text-white/55">
                Todavía no llega una foto. En la vista de la planta, pulsa «Enviar una foto».
              </div>
            )}
            {foto && (
              <div className="grid items-stretch gap-4 lg:grid-cols-2">
                <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-[0_12px_32px_rgb(0_0_0/0.35)]">
                  <img
                    src={foto.url}
                    alt="Foto de la planta enviada por la Raspberry Pi"
                    width={640}
                    height={480}
                    fetchPriority="high"
                    className="aspect-[4/3] w-full object-cover"
                  />
                </article>
                <article className="flex flex-col justify-center gap-5 rounded-2xl border border-white/10 bg-[#1a1a1a] p-5 shadow-[0_8px_24px_rgb(0_0_0/0.28)] sm:p-6">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">Hora</p>
                    <p className="mt-1 font-display text-2xl font-bold text-white">{formatearFecha(foto.created_at)}</p>
                  </div>
                  {sinAnalisis ? (
                    <p className="text-lg font-medium text-white/40">Sin análisis aún</p>
                  ) : (
                    <dl className="grid grid-cols-2 gap-3">
                      {[
                        ['Cobertura', foto.cobertura],
                        ['Verde', foto.verde],
                        ['Amarillo', foto.amarillo],
                        ['Seco visual', foto.seco],
                      ].map(([nombre, valor]) => {
                        const n = analisisDe(valor)
                        return (
                          <div key={nombre} className="rounded-xl bg-[#232323] px-3 py-3 ring-1 ring-white/5">
                            <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">{nombre}</dt>
                            <dd className="mt-1 font-display text-2xl font-bold text-white">
                              {n == null ? (
                                <span className="text-base font-medium text-white/40">Sin análisis aún</span>
                              ) : (
                                <>
                                  <Numero valor={n} />
                                  <span className="text-base text-white/45">%</span>
                                </>
                              )}
                            </dd>
                          </div>
                        )
                      })}
                    </dl>
                  )}
                </article>
              </div>
            )}
          </section>
        </Revelar>

        <section className="space-y-4" aria-label="Lectura de la demo">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Lecturas de la charla</h2>
              <p className="mt-1 text-sm text-white/55">Lo que el sensor acaba de medir, con la hora.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold ${enVivo ? 'aws-pulso bg-[#a4c639]/15 text-[#d4e68a]' : 'bg-[#232323] text-white/45'}`}>
                <span className={`h-2 w-2 rounded-full ${enVivo ? 'bg-[#a4c639]' : 'bg-white/30'}`} />
                {enVivo ? 'En vivo' : 'Conectando'}
              </span>
              <button type="button" onClick={cargar} className="btn-secondary">
                <IconRefresh />
                Actualizar
              </button>
            </div>
          </div>

          {cargando && (
            <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] py-16 text-center text-white/50">Cargando lecturas…</div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4">
              <p className="font-semibold text-red-200">No pude leer la tabla de la demo</p>
              <p className="mt-1 text-sm text-red-300/90">{error}</p>
            </div>
          )}

          {!cargando && !error && !ultima && (
            <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-10 text-center">
              <p className="font-display text-2xl font-bold text-white">Todavía no hay lecturas</p>
              <p className="mx-auto mt-3 max-w-md leading-relaxed text-white/55">
                Cuando el Wemos envíe, o cuando llegue una prueba, aparece aquí.
              </p>
            </div>
          )}

          {ultima && (
            <>
              <div className="grid items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
                <article className={`rounded-2xl border-2 bg-[#1a1a1a] p-6 transition duration-300 hover:-translate-y-0.5 sm:p-8 ${piel.borde} ${piel.brillo}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#a4c639]">Última lectura</p>
                      <p className="mt-2 font-display text-2xl font-bold text-white">{nodo?.nombre ?? ultima.device_id}</p>
                      <p className="mt-1 text-white/55">
                        {nodo?.parcela ?? 'Nodo de la charla'} · {formatearFecha(ultima.created_at)}
                      </p>
                    </div>
                    <p className={`rounded-full px-3 py-1 text-sm font-bold ${piel.badge}`}>{senal.reciente ? suelo.etiqueta : senal.etiqueta}</p>
                  </div>

                  <div className="mt-8">
                    <p className="text-sm font-semibold text-white/70">Humedad del suelo</p>
                    <p className="mt-1 font-display text-6xl font-bold tracking-tight text-white sm:text-7xl">
                      <Numero valor={ultima.humedad_suelo} className="text-white" />
                      <span className="ml-1 text-3xl text-white/40">%</span>
                    </p>
                    <p className={`mt-3 text-lg font-bold ${senal.reciente ? suelo.tono : 'text-neutral-400'}`}>
                      {senal.reciente ? suelo.etiqueta : senal.etiqueta}
                    </p>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#121212] ring-1 ring-white/10">
                      <div
                        className={`h-full rounded-full ${piel.barra}`}
                        style={{ width: `${Math.min(100, Math.max(0, Number(ultima.humedad_suelo) || 0))}%` }}
                      />
                    </div>
                  </div>

                  <dl className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-[#232323] px-4 py-3 ring-1 ring-white/5">
                      <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/45">
                        <IconThermometer className="h-4 w-4" /> Suelo
                      </dt>
                      <dd className="mt-2 text-2xl font-bold text-white">
                        {ultima.temp_suelo == null || ultima.temp_suelo === '' ? (
                          <span className="text-base font-medium text-white/35">Sin dato</span>
                        ) : (
                          <Numero valor={ultima.temp_suelo} unidad="" />
                        )}
                        {ultima.temp_suelo != null && ultima.temp_suelo !== '' && <span className="text-base text-white/45">°C</span>}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-[#232323] px-4 py-3 ring-1 ring-white/5">
                      <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/45">
                        <IconSun className="h-4 w-4" /> Ambiente
                      </dt>
                      <dd className="mt-2 text-2xl font-bold text-white">
                        <Numero valor={ultima.temp_ambiente} />
                        <span className="text-base text-white/45">°C</span>
                      </dd>
                    </div>
                    <div className="rounded-xl bg-[#232323] px-4 py-3 ring-1 ring-white/5">
                      <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/45">
                        <IconCloud className="h-4 w-4" /> Humedad aire
                      </dt>
                      <dd className="mt-2 text-2xl font-bold text-white">
                        <Numero valor={ultima.humedad_ambiente} />
                        <span className="text-base text-white/45">%</span>
                      </dd>
                    </div>
                  </dl>
                </article>

                <article className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-5 shadow-[0_8px_24px_rgb(0_0_0/0.28)] transition duration-300 hover:-translate-y-0.5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#232323] text-amber-200 ring-1 ring-white/10">
                      <NotebookPen className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#a4c639]">Bitácora del suelo</p>
                      <h3 className="font-display text-2xl font-bold text-white">Cuándo estuvo seco</h3>
                    </div>
                  </div>
                  {bitacora.length === 0 ? (
                    <p className="mt-4 text-base leading-relaxed text-white/80">
                      En estas lecturas el suelo no bajó de {UMBRAL_SUELO_SECO} %. Cuando se mantenga seco, aquí queda la hora de inicio y la hora de fin.
                    </p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {bitacora.map((tramo) => (
                        <li key={`${tramo.desde}-${tramo.hasta}`} className="rounded-xl bg-[#232323] px-4 py-3 ring-1 ring-white/5">
                          <p className="flex items-center gap-2 font-bold text-amber-200">
                            <IconDroplet className="h-4 w-4" />
                            Suelo seco
                          </p>
                          <p className="mt-1 leading-relaxed text-white">
                            Desde {formatearHora(tramo.desde)}
                            {tramo.sigue ? ' y sigue así.' : ` hasta ${formatearHora(tramo.hasta)}.`}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-4 text-sm leading-relaxed text-white/45">
                    La sequedad la marca el sensor. La Raspberry deja ver la planta para acompañar ese dato.
                  </p>
                </article>
              </div>

              <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-[0_8px_24px_rgb(0_0_0/0.28)]">
                <div className="border-b border-white/10 px-5 py-4">
                  <h3 className="font-display text-lg font-bold text-white">Historial</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="table-agri w-full">
                    <thead className="bg-[#121212]">
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
                        <tr key={fila.id} className={i === 0 ? 'bg-[#a4c639]/5' : ''}>
                          <td className="whitespace-nowrap text-white/80">{formatearFecha(fila.created_at)}</td>
                          <td className="font-semibold text-white">{ALI_NODOS_FALLBACK[fila.device_id]?.nombre ?? fila.device_id}</td>
                          <td className="text-right font-semibold tabular-nums text-[#a4c639]">{formatearNum(fila.humedad_suelo, '%')}</td>
                          <td className="text-right tabular-nums text-white/80">
                            {fila.temp_suelo == null || fila.temp_suelo === '' ? (
                              <span className="text-white/35">Sin dato</span>
                            ) : (
                              formatearNum(fila.temp_suelo, '°C')
                            )}
                          </td>
                          <td className="text-right tabular-nums text-white/80">{formatearNum(fila.temp_ambiente, '°C')}</td>
                          <td className="text-right tabular-nums text-white/80">{formatearNum(fila.humedad_ambiente, '%')}</td>
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

      <footer className="mt-auto border-t border-white/10 bg-[#1a1a1a] py-5">
        <p className="text-center text-xs font-medium text-white/45">
          <span className="font-bold text-white">ALISA</span>
          <span className="font-bold text-[#a4c639]">GRO</span>
          {' · '}
          Pantalla de la charla · las lecturas de producción siguen en el inicio
        </p>
      </footer>
    </div>
  )
}

function Parcela() {
  return (
    <svg viewBox="0 0 420 260" className="h-36 w-full max-w-md shrink-0 sm:h-52 lg:h-64" role="img" aria-label="Parcela con sensores y la cámara de la Raspberry">
      <rect x="0" y="0" width="420" height="260" rx="28" fill="#1a1a1a" />
      <path d="M0 168 C80 140 140 190 220 160 C300 130 350 150 420 128 L420 260 L0 260 Z" fill="#232323" />
      <path d="M0 190 C90 170 150 210 240 186 C320 164 370 176 420 160 L420 260 L0 260 Z" fill="#121212" />
      <g fill="#a4c639">
        <ellipse cx="70" cy="176" rx="16" ry="7" opacity="0.35" />
        <path d="M70 176 C66 150 58 142 62 128 C74 146 78 156 70 176 Z" />
        <path d="M70 176 C78 148 92 140 96 124 C82 146 74 158 70 176 Z" />
        <ellipse cx="150" cy="188" rx="18" ry="7" opacity="0.35" />
        <path d="M150 188 C144 158 132 148 136 130 C152 152 158 166 150 188 Z" />
        <path d="M150 188 C160 156 178 146 184 128 C166 154 156 168 150 188 Z" />
        <ellipse cx="250" cy="176" rx="16" ry="7" opacity="0.35" />
        <path d="M250 176 C244 150 232 140 236 124 C250 146 256 158 250 176 Z" />
        <path d="M250 176 C260 148 276 140 280 124 C264 148 254 160 250 176 Z" />
      </g>
      <rect x="292" y="78" width="86" height="58" rx="10" fill="#0e0e0e" stroke="#FF9900" strokeWidth="2" />
      <circle cx="335" cy="107" r="14" fill="#232323" stroke="#a4c639" strokeWidth="3" />
      <circle cx="335" cy="107" r="5" fill="#a4c639" />
      <path d="M318 78 L308 62 H362 L352 78" fill="none" stroke="#FF9900" strokeWidth="2" />
      <rect x="40" y="92" width="8" height="70" rx="2" fill="#d4e68a" />
      <circle cx="44" cy="86" r="10" fill="#a4c639" />
      <text x="28" y="48" fill="#a4c639" fontSize="13" fontFamily="system-ui, sans-serif" fontWeight="700">Parcela</text>
    </svg>
  )
}
