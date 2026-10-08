import { useCallback, useEffect, useState } from 'react'
import DiagramaEcosistema from './charla/DiagramaEcosistema.jsx'
import { RetoAnfitrion } from './charla/RetoSala.jsx'

const AWS = '/charla'

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

export default function CharlaPresentacion() {
  const [indice, setIndice] = useState(indiceInicial)
  const [menu, setMenu] = useState(false)
  const [pieza, setPieza] = useState(0)
  const lamina = LAMINAS[indice]

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
    <div className="flex h-dvh overflow-hidden bg-[#0e0e0e] text-white">
      <aside
        className={`absolute inset-y-0 left-0 z-30 w-72 border-r border-white/10 bg-[#141414] p-4 transition ${
          menu ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-lime">ALISAGRO × AWS</p>
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
              className={`flex w-full items-baseline justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                i === indice ? 'bg-lime text-[#121212]' : 'text-white/75 hover:bg-white/5'
              }`}
            >
              <span className="font-semibold">{item.nav}</span>
              <span className={`shrink-0 text-[10px] ${i === indice ? 'text-[#121212]/70' : 'text-white/35'}`}>
                {item.tiempo}
              </span>
            </button>
          ))}
        </nav>
        <a href="/aws" className="mt-4 block text-xs font-semibold text-lime hover:underline">
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
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg border border-white/15 px-2 py-1 text-sm"
              onClick={() => setMenu(true)}
              aria-label="Abrir secciones"
            >
              Menú
            </button>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-lime">{lamina.tiempo}</p>
              <p className="font-display text-sm font-bold text-white/90">{lamina.nav}</p>
            </div>
          </div>
          <p className="text-sm tabular-nums text-white/50">
            {indice + 1} / {LAMINAS.length}
          </p>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-6">
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
          {lamina.id === 'reto' && <RetoAnfitrion />}
          {lamina.id === 'cierre' && <LaminaCierre />}
        </main>

        <footer className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 sm:px-6">
          <button type="button" className="btn-secondary" onClick={() => ir(indice - 1)} disabled={indice === 0}>
            ← Anterior
          </button>
          <p className="hidden text-xs text-white/40 sm:block">Flechas del teclado para avanzar</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => ir(indice + 1)}
            disabled={indice === LAMINAS.length - 1}
          >
            Siguiente →
          </button>
        </footer>
      </div>
    </div>
  )
}

function LaminaInicio({ onEmpezar }) {
  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col justify-center">
      <img
        src="/charla/community-day.png"
        alt="AWS Community Day Guatemala"
        className="w-full max-w-lg"
      />
      <h1 className="mt-6 font-display text-5xl font-bold leading-[0.95] sm:text-6xl">
        <span className="text-white">ALISA</span>
        <span className="text-lime">GRO</span>
        <span className="mt-2 block text-3xl font-semibold text-white/80 sm:text-5xl">× AWS</span>
      </h1>
      <p className="mt-6 max-w-2xl text-xl leading-relaxed text-white/80 sm:text-2xl">
        De Arduino a la nube. Esto empezó como un proyecto de agricultura. Ahora vemos qué pasa
        cuando unimos el mundo físico, el software, AWS y la visión de una cámara.
      </p>
      <button type="button" className="btn-primary mt-8 w-fit px-6 py-3 text-base" onClick={onEmpezar}>
        Empezar por la planta
      </button>
    </div>
  )
}

function LaminaHook() {
  const caminos = [
    ['👀', 'Viéndola'],
    ['💧', 'Midiendo el suelo'],
    ['🌡️', 'Midiendo temperatura'],
    ['📷', 'Usando una cámara'],
    ['🤖', 'Usando visión'],
  ]
  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col justify-center">
      <h2 className="font-display text-4xl font-bold leading-tight sm:text-6xl">¿Está sana esta planta?</h2>
      <ul className="mt-8 grid gap-3 sm:grid-cols-5">
        {caminos.map(([icono, texto]) => (
          <li key={texto} className="rounded-2xl bg-white/5 px-3 py-5 text-center ring-1 ring-white/10">
            <span className="text-3xl">{icono}</span>
            <span className="mt-3 block text-sm font-semibold text-white/90">{texto}</span>
          </li>
        ))}
      </ul>
      <blockquote className="mt-8 border-l-4 border-lime pl-4 text-xl leading-relaxed text-white sm:text-2xl">
        ¿Cuál de estas creen que nos dice si la planta está bien? Ninguna, por sí sola, cuenta toda la historia.
      </blockquote>
    </div>
  )
}

function LaminaProblema() {
  const medidas = [
    ['Humedad', 'El suelo'],
    ['Temperatura', 'El aire y la tierra'],
    ['Lo que se ve', 'Las hojas, con la cámara'],
  ]
  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col justify-center">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-lime">Qué queremos saber</p>
      <h2 className="mt-2 font-display text-4xl font-bold sm:text-5xl">De la planta al dato</h2>
      <div className="mt-8 grid items-center gap-4 lg:grid-cols-[auto_1fr]">
        <div className="grid h-28 w-28 place-items-center rounded-3xl bg-lime text-5xl text-[#121212]">🌱</div>
        <ul className="grid gap-3 sm:grid-cols-3">
          {medidas.map(([titulo, detalle]) => (
            <li key={titulo} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <p className="font-display text-xl font-bold">{titulo}</p>
              <p className="mt-1 text-sm text-white/70">{detalle}</p>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-8 max-w-3xl text-xl leading-relaxed text-white/85">
        Aquí empieza ALISAGRO. Queremos convertir lo que está pasando en la parcela en datos que se puedan mirar,
        guardar y contar.
      </p>
    </div>
  )
}

function LaminaArduino() {
  return (
    <div className="mx-auto grid h-full max-w-5xl items-center gap-8 lg:grid-cols-2">
      <div>
        <h2 className="font-display text-4xl font-bold sm:text-5xl">Del sensor al dato</h2>
        <ol className="mt-6 space-y-3 text-lg text-white/85">
          <li>🌱 Planta</li>
          <li>🔌 Sensor</li>
          <li>Wemos D1 Mini</li>
          <li>Un JSON, cada minuto</li>
        </ol>
        <blockquote className="mt-6 border-l-4 border-lime pl-4 text-lg leading-relaxed">
          Hasta aquí esto podría ser un proyecto típico de Arduino. La pregunta es qué hacemos con esos datos.
        </blockquote>
      </div>
      <pre className="overflow-x-auto rounded-3xl bg-[#1a1a1a] p-6 text-left text-sm leading-relaxed text-lime ring-1 ring-white/10 sm:text-base">
        {`{
  "deviceId": "alisagro-01",
  "temperature": 26.3,
  "humidity": 55.0,
  "soilMoisture": 42.5
}`}
      </pre>
    </div>
  )
}

function LaminaArquitectura({ pieza, onPieza }) {
  const actual = PIEZAS[pieza]
  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col justify-center">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-4xl font-bold">Por qué AWS, y hasta dónde</h2>
        <p className="text-sm text-white/50">
          Pieza {pieza + 1} de {PIEZAS.length}
        </p>
      </div>
      <div className="mt-5 flex gap-2">
        {PIEZAS.map((item, i) => (
          <button
            key={item.titulo}
            type="button"
            aria-label={item.titulo}
            onClick={() => onPieza(i)}
            className={`h-2 flex-1 rounded-full transition ${i <= pieza ? 'bg-lime' : 'bg-white/15'}`}
          />
        ))}
      </div>
      <div className="mt-6 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-lime">{actual.titulo}</p>
        <p className="mt-3 text-2xl font-semibold leading-snug sm:text-3xl">{actual.frase}</p>
        <p className="mt-3 text-base text-white/70">{actual.detalle}</p>
      </div>
      <div className="mt-4">
        <DiagramaEcosistema paso={pieza} completo={false} />
      </div>
      <div className="mt-4 flex gap-2">
        <button type="button" className="btn-secondary" onClick={() => onPieza(Math.max(0, pieza - 1))} disabled={pieza === 0}>
          Pieza anterior
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => onPieza(Math.min(PIEZAS.length - 1, pieza + 1))}
          disabled={pieza === PIEZAS.length - 1}
        >
          Iluminar la siguiente
        </button>
      </div>
    </div>
  )
}

function LaminaDemo() {
  const pasos = [
    ['ALISAGRO', 'Esta es la aplicación. El monitoreo de siempre sigue en su lugar.', '/'],
    ['El dispositivo', 'En la mesa: planta, sensores y Wemos. Si aún no está cableado, la lectura de prueba ya recorrió este mismo camino.', null],
    ['IoT Core', 'El mensaje llega a us-east-1, en el tema de alisagro-01.', 'https://us-east-1.console.aws.amazon.com/iot/home?region=us-east-1#/test'],
    ['Lambda', 'alisagro-demo-ingest revisa números y los entrega.', 'https://us-east-1.console.aws.amazon.com/lambda/home?region=us-east-1#/functions/alisagro-demo-ingest'],
    ['La tabla de la charla', 'Supabase guarda la lectura aparte de la finca real.', '/aws'],
    ['De vuelta aquí', 'La pantalla de la charla muestra suelo, hora y bitácora.', '/aws'],
  ]
  return (
    <div className="mx-auto max-w-5xl">
      <h2 className="font-display text-4xl font-bold">La demo es el sistema, no un dibujo</h2>
      <ol className="mt-6 grid gap-3 sm:grid-cols-2">
        {pasos.map(([titulo, texto, href], i) => (
          <li key={titulo} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-lime text-sm font-bold text-[#121212]">
              {i + 1}
            </span>
            <p className="mt-3 font-display text-xl font-bold">{titulo}</p>
            <p className="mt-1 text-sm leading-relaxed text-white/75">{texto}</p>
            {href && (
              <a href={href} className="mt-3 inline-block text-sm font-bold text-lime hover:underline" target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
                Abrir
              </a>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

function LaminaEdge() {
  const barras = [
    ['Verde', '82%', 'bg-lime'],
    ['Amarillo', '13%', 'bg-amber-300'],
    ['Seco', '5%', 'bg-orange-700'],
  ]
  return (
    <div className="mx-auto grid h-full max-w-5xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <h2 className="font-display text-4xl font-bold sm:text-5xl">Y si también la miramos</h2>
        <p className="mt-4 text-xl leading-relaxed text-white/80">
          Los sensores dicen qué está pasando. La cámara dice qué estamos viendo.
        </p>
        <ol className="mt-6 space-y-2 text-lg text-white/85">
          <li>🌱 Planta</li>
          <li>📷 Cámara USB</li>
          <li className="flex items-center gap-2">
            <img src={`${AWS}/raspberrypi.svg`} alt="" className="h-6 w-6 brightness-0 invert" />
            Raspberry Pi 5, aquí al lado
          </li>
          <li className="flex items-center gap-2">
            <img src={`${AWS}/python.svg`} alt="" className="h-6 w-6 brightness-0 invert" />
            Visión en la Pi, no un modelo que diagnostica
          </li>
        </ol>
      </div>
      <div className="rounded-3xl bg-white p-6 text-neutral-900">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">Ejemplo de la pantalla de la Pi</p>
        <ul className="mt-4 space-y-4">
          {barras.map(([nombre, valor, color]) => (
            <li key={nombre}>
              <div className="flex justify-between text-sm font-bold">
                <span>{nombre}</span>
                <span>{valor}</span>
              </div>
              <div className="mt-1 h-3 overflow-hidden rounded-full bg-neutral-200">
                <div className={`h-full ${color}`} style={{ width: valor }} />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm leading-relaxed text-neutral-600">
          Estos porcentajes ilustran la vista. No dicen el nombre de la especie ni una enfermedad.
          Si el suelo está seco, eso lo dice el sensor.
        </p>
      </div>
    </div>
  )
}

function LaminaViaje() {
  return (
    <div className="mx-auto max-w-6xl">
      <h2 className="font-display text-3xl font-bold sm:text-4xl">El viaje completo</h2>
      <p className="mt-2 max-w-3xl text-base text-white/75">
        Empezamos en una planta. Generamos datos. AWS los recibe. ALISAGRO los muestra. Al lado, la Pi mira.
      </p>
      <div className="mt-4">
        <DiagramaEcosistema />
      </div>
    </div>
  )
}

function LaminaComo() {
  const capas = ['Hardware', 'Firmware', 'AWS IoT', 'Lambda', 'Supabase', 'React']
  const temas = ['JSON', 'Certificado del dispositivo', 'IAM', 'Lambda', 'CloudWatch', 'Supabase', 'React', 'Vercel', 'Raspberry Pi', 'Python']
  return (
    <div className="mx-auto max-w-5xl">
      <h2 className="font-display text-4xl font-bold">Detrás de la pantalla</h2>
      <ol className="mt-5 flex flex-wrap gap-2">
        {capas.map((capa, i) => (
          <li key={capa} className="flex items-center gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold">{capa}</span>
            {i < capas.length - 1 && <span className="text-white/30">↓</span>}
          </li>
        ))}
      </ol>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <pre className="overflow-x-auto rounded-3xl bg-[#1a1a1a] p-5 text-sm leading-relaxed text-lime ring-1 ring-white/10">
          {`device_id: alisagro-01
temp_ambiente: 26.3
humedad_ambiente: 55
humedad_suelo: 42.5
metodo_captura: IOT`}
        </pre>
        <div>
          <p className="text-lg leading-relaxed text-white/85">
            Lambda traduce el JSON del Wemos al esquema que ALISAGRO ya entiende. Si un número viene fuera de rango, no se guarda.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {temas.map((tema) => (
              <li key={tema} className="rounded-full bg-lime/15 px-3 py-1 text-xs font-bold text-lime">
                {tema}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function LaminaCierre() {
  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col justify-center text-center">
      <p className="font-display text-4xl font-bold leading-tight sm:text-6xl">
        Del mundo físico
        <span className="mt-2 block text-lime">al mundo digital.</span>
      </p>
      <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/80 sm:text-xl">
        Arduino puede ser el comienzo. Ese dispositivo se puede unir a la nube, a una aplicación y a una cámara que mira la misma planta.
      </p>
      <p className="mx-auto mt-6 max-w-2xl text-xl font-semibold leading-relaxed sm:text-2xl">
        IoT es conectar el mundo físico con el mundo digital.
      </p>
      <img
        src="/charla/community-day.png"
        alt="AWS Community Day Guatemala"
        className="mx-auto mt-8 w-full max-w-sm"
      />
    </div>
  )
}
