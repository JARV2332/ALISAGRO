import { useCallback, useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  Activity,
  ArrowRight,
  Braces,
  Camera,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Cpu,
  Database,
  Droplets,
  Eye,
  LayoutDashboard,
  Monitor,
  Radio,
  ScanEye,
  Sprout,
  Thermometer,
  X,
} from 'lucide-react'
import DiagramaEcosistema from './charla/DiagramaEcosistema.jsx'
import { RetoAnfitrion } from './charla/RetoSala.jsx'

const AWS = '/charla'
const URL_AWS = 'https://alisagro.com/aws'

const LAMINAS = [
  { id: 'inicio', nav: 'Inicio', tiempo: '0 min' },
  { id: 'hook', nav: 'La planta', tiempo: '0–4 min' },
  { id: 'problema', nav: '01 · El problema', tiempo: '4–9 min' },
  { id: 'arduino', nav: '02 · Del Arduino al IoT', tiempo: '9–14 min' },
  { id: 'arquitectura', nav: '03 · Arquitectura', tiempo: '14–20 min' },
  { id: 'demo', nav: '04 · Demo', tiempo: '20–27 min' },
  { id: 'edge', nav: '05 · Edge AI', tiempo: '27–33 min' },
  { id: 'viaje', nav: '06 · El viaje del dato', tiempo: '33–38 min' },
  { id: 'como', nav: '07 · Cómo se construyó', tiempo: '38–43 min' },
  { id: 'reto', nav: '08 · Reto', tiempo: '43–48 min' },
  { id: 'cierre', nav: '09 · Conclusión', tiempo: '48–50 min' },
]

const HALOS = [
  ['18% 30%', '164 198 57'],
  ['82% 20%', '255 153 0'],
  ['20% 80%', '164 198 57'],
  ['75% 70%', '255 153 0'],
  ['50% 15%', '255 153 0'],
  ['12% 60%', '164 198 57'],
  ['88% 40%', '164 198 57'],
  ['30% 20%', '255 153 0'],
  ['70% 85%', '164 198 57'],
  ['50% 40%', '255 153 0'],
  ['40% 25%', '164 198 57'],
]

const PIEZAS = [
  {
    titulo: 'La planta',
    detalle: 'Todavía no hay nube. Hay suelo, aire y hojas.',
    frase: 'No empiezo por AWS. Empiezo por la planta.',
  },
  {
    titulo: 'Wemos',
    detalle: 'El microcontrolador toma la lectura y la publica.',
    frase: 'Hasta aquí esto podría ser un proyecto típico de Arduino. ¿Qué hacemos con esos datos?',
  },
  {
    titulo: 'AWS IoT Core',
    detalle: 'El dispositivo entra al ecosistema, con su certificado.',
    frase: 'Este es el punto donde nuestro dispositivo entra a la nube.',
  },
  {
    titulo: 'Lambda',
    detalle: 'Revisa el JSON. Si viene bien, lo entrega. No hay un servidor encendido esperando.',
    frase: 'Procesamos el evento cuando llega. Nada queda prendido de por vida.',
  },
  {
    titulo: 'Supabase',
    detalle: 'La lectura cae en la tabla de la charla, aparte de las lecturas reales.',
    frase: 'No todo tiene que estar en AWS. ALISAGRO ya vive en Supabase, y ahí se queda.',
  },
  {
    titulo: 'ALISAGRO',
    detalle: 'La misma aplicación. Una pantalla más para contar esta historia.',
    frase: 'No migramos ALISAGRO a AWS. Extendimos ALISAGRO con AWS.',
  },
]

function indiceInicial() {
  const params = new URLSearchParams(window.location.search)
  if (params.get('reto') === '1') return LAMINAS.findIndex((lamina) => lamina.id === 'reto')
  const id = params.get('l')
  const porId = LAMINAS.findIndex((lamina) => lamina.id === id)
  return porId >= 0 ? porId : 0
}

function Chip({ icono: Icono, tono = 'lima', grande = false }) {
  const caja = grande ? 'h-16 w-16' : 'h-12 w-12'
  const color = tono === 'naranja'
    ? 'bg-[#FF9900]/10 text-[#FF9900]'
    : 'bg-[#a4c639]/10 text-[#a4c639]'
  return (
    <span className={`grid ${caja} shrink-0 place-items-center rounded-2xl ${color}`}>
      <Icono size={grande ? 32 : 26} strokeWidth={2} />
    </span>
  )
}

function Tarjeta({ children, className = '' }) {
  return (
    <div className={`rounded-3xl bg-[#1a1a1a] p-5 shadow-[0_16px_40px_rgb(0_0_0/0.35)] ring-1 ring-white/10 ${className}`}>
      {children}
    </div>
  )
}

export default function CharlaPresentacion() {
  const [indice, setIndice] = useState(indiceInicial)
  const [menu, setMenu] = useState(false)
  const [pieza, setPieza] = useState(0)
  const lamina = LAMINAS[indice]
  const [posicion, rgb] = HALOS[indice]

  const ir = useCallback((siguiente) => {
    setIndice((actual) => {
      const destino = typeof siguiente === 'number' ? siguiente : actual
      return Math.max(0, Math.min(LAMINAS.length - 1, destino))
    })
    setMenu(false)
  }, [])

  useEffect(() => {
    const titulo = document.title
    document.title = 'ALISAGRO × AWS | Community Day'
    return () => {
      document.title = titulo
    }
  }, [])

  useEffect(() => {
    function alTeclado(evento) {
      if (evento.key === 'Escape') {
        setMenu(false)
        return
      }
      const etiqueta = evento.target?.tagName
      if (etiqueta === 'INPUT' || etiqueta === 'TEXTAREA') return
      if (evento.key === 'ArrowRight' || evento.key === 'PageDown') ir(indice + 1)
      if (evento.key === 'ArrowLeft' || evento.key === 'PageUp') ir(indice - 1)
      if (evento.key === 'Home') ir(0)
      if (evento.key === 'End') ir(LAMINAS.length - 1)
    }
    window.addEventListener('keydown', alTeclado)
    return () => window.removeEventListener('keydown', alTeclado)
  }, [indice, ir])

  return (
    <div
      className="relative flex h-dvh overflow-hidden bg-[#121212] text-white"
      style={{
        backgroundImage: `radial-gradient(ellipse 58% 48% at ${posicion}, rgb(${rgb} / 0.07), transparent 70%)`,
      }}
    >
      <div className="absolute inset-x-0 top-0 z-40 h-1 bg-white/10" aria-hidden>
        <div
          className="h-full bg-[#a4c639] transition-[width] duration-500"
          style={{ width: `${((indice + 1) / LAMINAS.length) * 100}%` }}
        />
      </div>

      <aside
        className={`absolute inset-y-0 left-0 z-30 w-80 border-r border-white/10 bg-[#141414] p-4 shadow-[0_20px_60px_rgb(0_0_0/0.45)] transition ${
          menu ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-base font-bold uppercase tracking-[0.16em] text-lime">ALISAGRO × AWS</p>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-white"
            onClick={() => setMenu(false)}
            aria-label="Cerrar menú"
          >
            <X size={22} strokeWidth={2} />
          </button>
        </div>
        <img
          src="/charla/community-day.png"
          alt="AWS Community Day Guatemala"
          className="mt-3 h-16 w-auto max-w-full object-contain object-left"
        />
        <p className="mt-1 font-display text-lg font-bold leading-tight">De Arduino a la nube</p>
        <nav className="mt-5 space-y-1 overflow-y-auto" aria-label="Secciones de la charla">
          {LAMINAS.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => ir(i)}
              className={`flex w-full items-baseline justify-between gap-3 rounded-xl px-3 py-2 text-left text-base transition ${
                i === indice ? 'bg-lime text-[#121212]' : 'text-white/75 hover:bg-white/5'
              }`}
            >
              <span className="font-semibold">{item.nav}</span>
              <span className={`shrink-0 text-base ${i === indice ? 'text-[#121212]/70' : 'text-white/45'}`}>
                {item.tiempo}
              </span>
            </button>
          ))}
        </nav>
        <a href="/aws" className="mt-4 block text-base font-semibold text-lime hover:underline">
          Pantalla de lecturas
        </a>
      </aside>

      {menu && (
        <button
          type="button"
          className="absolute inset-0 z-20 bg-black/50"
          aria-label="Cerrar menú"
          onClick={() => setMenu(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 px-[6vw] py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-base"
              onClick={() => setMenu(true)}
              aria-label="Abrir secciones"
            >
              Menú
            </button>
            <div>
              <p className="text-base font-bold uppercase tracking-[0.14em] text-lime">{lamina.tiempo}</p>
              <p className="font-display text-lg font-bold text-white/90">{lamina.nav}</p>
            </div>
          </div>
          <p className="text-lg font-semibold tabular-nums text-white/70">
            {indice + 1} / {LAMINAS.length}
          </p>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-[6vw] pb-4">
          <div key={lamina.id} className="charla-lamina mx-auto flex h-full w-full max-w-7xl items-center">
            {lamina.id === 'inicio' && <LaminaInicio onEmpezar={() => ir(1)} />}
            {lamina.id === 'hook' && <LaminaHook />}
            {lamina.id === 'problema' && <LaminaProblema />}
            {lamina.id === 'arduino' && <LaminaArduino />}
            {lamina.id === 'arquitectura' && (
              <LaminaArquitectura pieza={pieza} onPieza={setPieza} />
            )}
            {lamina.id === 'demo' && <LaminaDemo />}
            {lamina.id === 'edge' && <LaminaEdge />}
            {lamina.id === 'viaje' && <LaminaViaje />}
            {lamina.id === 'como' && <LaminaComo />}
            {lamina.id === 'reto' && <LaminaReto />}
            {lamina.id === 'cierre' && <LaminaCierre />}
          </div>
        </main>

        <footer className="flex items-center justify-between gap-3 px-[6vw] py-3">
          <button type="button" className="btn-secondary inline-flex items-center gap-2 text-base" onClick={() => ir(indice - 1)} disabled={indice === 0}>
            <ChevronLeft size={20} strokeWidth={2} />
            Anterior
          </button>
          <p className="hidden text-base text-white/55 sm:block">Flechas del teclado para avanzar</p>
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2 text-base"
            onClick={() => ir(indice + 1)}
            disabled={indice === LAMINAS.length - 1}
          >
            Siguiente
            <ChevronRight size={20} strokeWidth={2} />
          </button>
        </footer>
      </div>
    </div>
  )
}

function LaminaInicio({ onEmpezar }) {
  return (
    <div className="charla-entra grid h-full w-full items-center gap-8 lg:grid-cols-2">
      <div>
        <img
          src="/charla/community-day.png"
          alt="AWS Community Day Guatemala"
          className="w-full max-w-xl"
        />
        <h1 className="charla-titulo mt-5 font-display font-bold leading-[0.95]">
          ALISAGRO
          <span className="text-[#a4c639]"> × AWS</span>
        </h1>
        <p className="charla-cuerpo mt-5 max-w-xl text-white/80">
          De Arduino a la nube. Esto empezó como un proyecto de agricultura. Ahora vemos qué pasa
          cuando unimos el mundo físico, el software, AWS y la visión de una cámara.
        </p>
        <button type="button" className="btn-primary mt-6 w-fit px-6 py-3 text-lg" onClick={onEmpezar}>
          Empezar por la planta
        </button>
      </div>
      <img
        src="/img/montaje.jpg"
        alt="Montaje de la planta, el sensor y la cámara"
        className="h-[min(68vh,640px)] w-full rounded-[28px] object-cover shadow-[0_20px_50px_rgb(0_0_0/0.45)] ring-1 ring-white/10"
      />
    </div>
  )
}

function LaminaHook() {
  const caminos = [
    [Eye, 'Viéndola'],
    [Droplets, 'Midiendo el suelo'],
    [Thermometer, 'Midiendo temperatura'],
    [Camera, 'Usando una cámara'],
    [ScanEye, 'Usando visión'],
  ]
  return (
    <div className="charla-entra grid h-full w-full items-center gap-8 lg:grid-cols-2">
      <img
        src="/img/planta.jpg"
        alt="La planta de la charla"
        className="h-[min(70vh,680px)] w-full rounded-[28px] object-cover shadow-[0_20px_50px_rgb(0_0_0/0.45)] ring-1 ring-white/10"
      />
      <div>
        <h2 className="charla-titulo font-display font-bold">¿Está sana esta planta?</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {caminos.map(([Icono, texto]) => (
            <li key={texto}>
              <Tarjeta className="flex items-center gap-4">
                <Chip icono={Icono} />
                <span className="charla-tarjeta font-semibold text-white">{texto}</span>
              </Tarjeta>
            </li>
          ))}
        </ul>
        <blockquote className="charla-cuerpo mt-6 border-l-4 border-[#a4c639] pl-4 text-white">
          ¿Cuál de estas creen que nos dice si la planta está bien? Ninguna, por sí sola, cuenta toda la historia.
        </blockquote>
      </div>
    </div>
  )
}

function LaminaProblema() {
  const medidas = [
    [Droplets, 'Humedad', 'El suelo', '42.5%'],
    [Thermometer, 'Temperatura', 'El aire y la tierra', '26.3°C'],
    [Eye, 'Lo que se ve', 'Las hojas, con la cámara', 'Verde 82%'],
  ]
  return (
    <div className="charla-entra flex h-full w-full flex-col justify-center">
      <p className="text-base font-bold uppercase tracking-[0.16em] text-[#a4c639]">Qué queremos saber</p>
      <h2 className="charla-titulo mt-2 font-display font-bold">De la planta al dato</h2>
      <ul className="mt-8 grid gap-4 lg:grid-cols-3">
        {medidas.map(([Icono, titulo, detalle, valor]) => (
          <li key={titulo}>
            <Tarjeta className="flex h-full flex-col gap-4">
              <Chip icono={Icono} grande />
              <p className="font-display text-[clamp(1.5rem,2.4vw,2.25rem)] font-bold">{titulo}</p>
              <p className="charla-tarjeta text-white/70">{detalle}</p>
              <p className="mt-auto font-display text-[clamp(2rem,3vw,3rem)] font-bold text-[#FF9900]">{valor}</p>
            </Tarjeta>
          </li>
        ))}
      </ul>
      <p className="charla-cuerpo mt-6 max-w-4xl text-white/85">
        Aquí empieza ALISAGRO. Queremos convertir lo que está pasando en la parcela en datos que se puedan mirar,
        guardar y contar.
      </p>
    </div>
  )
}

function LaminaArduino() {
  const pasos = [
    [Sprout, 'Planta'],
    [Activity, 'Sensor'],
    [Cpu, 'Wemos D1 Mini'],
    [Braces, 'JSON'],
  ]
  return (
    <div className="charla-entra flex h-full w-full flex-col justify-center gap-6">
      <h2 className="charla-titulo font-display font-bold">Del sensor al dato</h2>
      <ol className="flex items-center gap-2">
        {pasos.map(([Icono, texto], i) => (
          <li key={texto} className="flex min-w-0 flex-1 items-center gap-2">
            <Tarjeta className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
              <Chip icono={Icono} tono={i === pasos.length - 1 ? 'naranja' : 'lima'} />
              <span className="charla-tarjeta font-semibold">{texto}</span>
            </Tarjeta>
            {i < pasos.length - 1 && <ArrowRight size={28} strokeWidth={2} className="shrink-0 text-[#FF9900]" />}
          </li>
        ))}
      </ol>
      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <blockquote className="charla-cuerpo border-l-4 border-[#a4c639] pl-4">
          Hasta aquí esto podría ser un proyecto típico de Arduino. La pregunta es qué hacemos con esos datos.
        </blockquote>
      <pre className="overflow-x-auto rounded-3xl bg-[#121212] p-8 leading-relaxed shadow-[0_16px_40px_rgb(0_0_0/0.35)] ring-1 ring-white/10" style={{ fontSize: 'clamp(1.125rem, 1.8vw, 1.75rem)' }}>
        <span className="text-white/45">{'{'}</span>{'\n'}
        {'  '}<span className="text-[#a4c639]">&quot;deviceId&quot;</span><span className="text-white/45">: </span><span className="text-white">&quot;alisagro-01&quot;</span>{'\n'}
        {'  '}<span className="text-[#a4c639]">&quot;temperature&quot;</span><span className="text-white/45">: </span><span className="text-[#FF9900]">26.3</span>{'\n'}
        {'  '}<span className="text-[#a4c639]">&quot;humidity&quot;</span><span className="text-white/45">: </span><span className="text-[#FF9900]">55.0</span>{'\n'}
        {'  '}<span className="text-[#a4c639]">&quot;soilMoisture&quot;</span><span className="text-white/45">: </span><span className="text-[#FF9900]">42.5</span>{'\n'}
        <span className="text-white/45">{'}'}</span>
      </pre>
      </div>
    </div>
  )
}

function LaminaArquitectura({ pieza, onPieza }) {
  const actual = PIEZAS[pieza]
  return (
    <div className="charla-entra flex h-full w-full flex-col justify-center gap-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-[clamp(1.6rem,2.4vw,2.4rem)] font-bold leading-tight">Por qué AWS, y hasta dónde</h2>
        <p className="shrink-0 text-lg text-white/60">Pieza {pieza + 1} de {PIEZAS.length}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-2">
          {PIEZAS.map((item, i) => (
            <button
              key={item.titulo}
              type="button"
              aria-label={item.titulo}
              onClick={() => onPieza(i)}
              className={`h-2 flex-1 rounded-full transition ${i === pieza ? 'bg-[#a4c639] shadow-[0_0_12px_rgb(164_198_57/0.8)]' : i < pieza ? 'bg-[#a4c639]/50' : 'bg-white/15'}`}
            />
          ))}
        </div>
        <button type="button" className="btn-secondary shrink-0 text-base" onClick={() => onPieza(Math.max(0, pieza - 1))} disabled={pieza === 0}>
          Pieza anterior
        </button>
        <button
          type="button"
          className="btn-primary shrink-0 text-base"
          onClick={() => onPieza(Math.min(PIEZAS.length - 1, pieza + 1))}
          disabled={pieza === PIEZAS.length - 1}
        >
          Iluminar la siguiente
        </button>
      </div>
      <p className="text-[clamp(1.2rem,1.8vw,1.6rem)] font-semibold leading-snug">
        <span className="mr-3 text-base font-bold uppercase tracking-[0.14em] text-[#a4c639]">{actual.titulo}.</span>
        {actual.frase}
      </p>
      <DiagramaEcosistema paso={pieza} completo={false} />
    </div>
  )
}

function LaminaDemo() {
  const pasos = [
    [Monitor, 'ALISAGRO', 'Esta es la aplicación. El monitoreo de siempre sigue en su lugar.', '/'],
    [Sprout, 'El dispositivo', 'En la mesa: planta, sensores y Wemos. Si aún no está cableado, la lectura de prueba ya recorrió este mismo camino.', null],
    [Radio, 'IoT Core', 'El mensaje llega a us-east-1, en el tema de alisagro-01.', 'https://us-east-1.console.aws.amazon.com/iot/home?region=us-east-1#/test'],
    [Cloud, 'Lambda', 'alisagro-demo-ingest revisa números y los entrega.', 'https://us-east-1.console.aws.amazon.com/lambda/home?region=us-east-1#/functions/alisagro-demo-ingest'],
    [Database, 'La tabla de la charla', 'Supabase guarda la lectura aparte de la finca real.', '/aws'],
    [LayoutDashboard, 'De vuelta aquí', 'La pantalla de la charla muestra suelo, hora y bitácora.', '/aws'],
  ]
  return (
    <div className="charla-entra flex h-full w-full flex-col justify-center">
      <h2 className="font-display text-[clamp(1.75rem,3vw,2.75rem)] font-bold">La demo es el sistema, no un dibujo</h2>
      <ol className="mt-4 grid flex-1 grid-cols-2 grid-rows-3 gap-3 lg:grid-cols-3 lg:grid-rows-2">
        {pasos.map(([Icono, titulo, texto, href], i) => (
          <li key={titulo} className="min-h-0">
            <Tarjeta className="flex h-full flex-col">
              <div className="flex items-center gap-3">
                <Chip icono={Icono} />
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#232323] text-base font-bold text-[#a4c639]">
                  {i + 1}
                </span>
              </div>
              <p className="mt-3 font-display text-[clamp(1.15rem,1.6vw,1.5rem)] font-bold">{titulo}</p>
              <p className="charla-tarjeta mt-1 leading-snug text-white/75">{texto}</p>
              {href && (
                <a href={href} className="mt-auto pt-3 text-base font-bold text-[#a4c639] hover:underline" target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
                  Abrir
                </a>
              )}
            </Tarjeta>
          </li>
        ))}
      </ol>
    </div>
  )
}

function LaminaEdge() {
  const barras = [
    ['Verde', '82%', 'bg-[#a4c639]'],
    ['Amarillo', '13%', 'bg-amber-300'],
    ['Seco', '5%', 'bg-orange-700'],
  ]
  const pasos = [
    [Sprout, 'Planta'],
    [Camera, 'Cámara USB'],
  ]
  return (
    <div className="charla-entra flex h-full w-full flex-col justify-center gap-4">
      <div className="grid items-center gap-5 lg:grid-cols-2">
      <div>
        <h2 className="font-display text-[clamp(2rem,3.4vw,3.25rem)] font-bold leading-none">Y si también la miramos</h2>
        <p className="mt-3 text-lg leading-snug text-white/80">
          Los sensores dicen qué está pasando. La cámara dice qué estamos viendo.
        </p>
        <ul className="mt-3 space-y-2">
          {pasos.map(([Icono, texto]) => (
            <li key={texto} className="flex items-center gap-3 text-lg">
              <Chip icono={Icono} />
              {texto}
            </li>
          ))}
          <li className="flex items-center gap-3 text-lg">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#a4c639]/10">
              <img src={`${AWS}/raspberrypi.svg`} alt="" className="h-7 w-7 brightness-0 invert" />
            </span>
            Raspberry Pi 5, aquí al lado
          </li>
          <li className="flex items-center gap-3 text-lg">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#a4c639]/10">
              <img src={`${AWS}/python.svg`} alt="" className="h-7 w-7 brightness-0 invert" />
            </span>
            Visión en la Pi, no un modelo que diagnostica
          </li>
        </ul>
      </div>
      <img
        src="/img/camara-ejemplo.jpg"
        alt="La cámara apuntando a la planta"
        className="h-[min(36vh,380px)] w-full rounded-[28px] object-cover shadow-[0_20px_50px_rgb(0_0_0/0.45)] ring-1 ring-white/10"
      />
      </div>
      <Tarjeta className="bg-[#121212]">
        <p className="text-base font-bold uppercase tracking-[0.16em] text-white/55">Ejemplo de la pantalla de la Pi</p>
        <ul className="mt-3 grid gap-4 lg:grid-cols-3">
          {barras.map(([nombre, valor, color]) => (
            <li key={nombre}>
              <div className="flex justify-between text-lg font-bold">
                <span>{nombre}</span>
                <span>{valor}</span>
              </div>
              <div className="mt-2 h-5 overflow-hidden rounded-full bg-[#232323]">
                <div className={`h-full ${color}`} style={{ width: valor }} />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-base leading-snug text-white/70">
          Estos porcentajes ilustran la vista. No dicen el nombre de la especie ni una enfermedad.
          Si el suelo está seco, eso lo dice el sensor.
        </p>
      </Tarjeta>
    </div>
  )
}

function LaminaViaje() {
  return (
    <div className="charla-entra flex h-full w-full flex-col justify-start gap-2">
      <h2 className="shrink-0 font-display text-[clamp(1.6rem,2.4vw,2.4rem)] font-bold leading-tight">El viaje completo</h2>
      <DiagramaEcosistema />
    </div>
  )
}

function LaminaComo() {
  const capas = ['Hardware', 'Firmware', 'AWS IoT', 'Lambda', 'Supabase', 'React']
  const temas = ['JSON', 'Certificado del dispositivo', 'IAM', 'Lambda', 'CloudWatch', 'Supabase', 'React', 'Vercel', 'Raspberry Pi', 'Python']
  return (
    <div className="charla-entra flex h-full w-full flex-col justify-center">
      <h2 className="charla-titulo font-display font-bold">Detrás de la pantalla</h2>
      <ol className="mt-6 flex flex-wrap items-center gap-2">
        {capas.map((capa, i) => (
          <li key={capa} className="flex items-center gap-2">
            <span className="rounded-full bg-[#232323] px-4 py-2 text-lg font-bold ring-1 ring-white/10">{capa}</span>
            {i < capas.length - 1 && <ArrowRight size={22} strokeWidth={2} className="text-[#FF9900]" />}
          </li>
        ))}
      </ol>
      <div className="mt-6 grid items-start gap-4 lg:grid-cols-2">
        <pre className="overflow-x-auto rounded-3xl bg-[#121212] p-6 leading-relaxed text-[#a4c639] shadow-[0_16px_40px_rgb(0_0_0/0.35)] ring-1 ring-white/10" style={{ fontSize: 'clamp(1.125rem, 1.6vw, 1.5rem)' }}>
          {`device_id: alisagro-01
temp_ambiente: 26.3
humedad_ambiente: 55
humedad_suelo: 42.5
metodo_captura: IOT`}
        </pre>
        <div>
          <p className="charla-cuerpo text-white/85">
            Lambda traduce el JSON del Wemos al esquema que ALISAGRO ya entiende. Si un número viene fuera de rango, no se guarda.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {temas.map((tema) => (
              <li key={tema} className="rounded-full bg-[#a4c639]/15 px-4 py-2 text-base font-bold text-[#a4c639]">
                {tema}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function LaminaReto() {
  const url = `${window.location.origin}/community-day?reto=1`
  const pasos = [
    'Creas la sala en esta pantalla.',
    'El público entra con el QR y elige un apodo.',
    'Das iniciar y las respuestas aparecen aquí.',
  ]
  return (
    <div className="charla-entra grid h-full w-full items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <div>
        <h2 className="charla-titulo font-display font-bold">El reto</h2>
        <ol className="mt-6 space-y-4">
          {pasos.map((texto, i) => (
            <li key={texto} className="flex items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#FF9900]/10 text-lg font-bold text-[#FF9900]">
                {i + 1}
              </span>
              <span className="charla-cuerpo">{texto}</span>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex items-center gap-5">
          <div className="rounded-3xl bg-white p-3 shadow-[0_16px_40px_rgb(0_0_0/0.35)]">
            <QRCodeSVG value={url} size={210} bgColor="#ffffff" fgColor="#121212" />
          </div>
          <p className="charla-tarjeta max-w-xs text-white/80">Escaneen para entrar a la sala de esta charla.</p>
        </div>
      </div>
      <div className="charla-reto">
        <Tarjeta>
          <RetoAnfitrion />
        </Tarjeta>
      </div>
    </div>
  )
}

function LaminaCierre() {
  return (
    <div className="charla-entra grid h-full w-full items-center gap-10 lg:grid-cols-[1.3fr_0.7fr]">
      <div>
        <img
          src="/charla/community-day.png"
          alt="AWS Community Day Guatemala"
          className="w-full max-w-xs"
        />
        <h2 className="mt-4 font-display text-[clamp(2.2rem,4vw,3.75rem)] font-bold leading-[0.98]">
          Del mundo físico
          <span className="mt-2 block text-[#a4c639]">al mundo digital.</span>
        </h2>
        <p className="charla-cuerpo mt-4 max-w-2xl text-white/80">
          Arduino puede ser el comienzo. Ese dispositivo se puede unir a la nube, a una aplicación, a Alexa y a una cámara que mira la misma planta.
        </p>
        <p className="mt-3 text-lg text-white/70">
          <a href={URL_AWS} className="font-bold text-[#a4c639] hover:underline">alisagro.com/aws</a>
          <span className="mx-3 text-white/30">·</span>
          <a href="https://github.com/JARV2332/ALISAGRO" className="font-bold text-white hover:underline" target="_blank" rel="noreferrer">GitHub</a>
        </p>
        <p className="mt-3 max-w-2xl text-xl font-semibold leading-snug">
          IoT es conectar el mundo físico con el mundo digital.
        </p>
      </div>
      <div className="justify-self-center rounded-[28px] bg-white p-5 shadow-[0_20px_50px_rgb(0_0_0/0.45)]">
        <QRCodeSVG value={URL_AWS} size={280} bgColor="#ffffff" fgColor="#121212" />
        <p className="mt-3 text-center text-lg font-bold text-[#121212]">alisagro.com/aws</p>
      </div>
    </div>
  )
}
