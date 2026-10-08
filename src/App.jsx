import { lazy, Suspense, useState } from 'react'
import CharlaAws from './components/CharlaAws.jsx'
import CharlaPresentacion from './components/CharlaPresentacion.jsx'
import { RetoJugador } from './components/charla/RetoSala.jsx'
import Dashboard from './components/Dashboard.jsx'
import OcrScanner from './components/OcrScanner.jsx'
import VoiceCapture from './components/VoiceCapture.jsx'
import { IconChart, IconCamera, IconLogo, IconMic, IconReport } from './components/Icons.jsx'

function rutaLimpia() {
  return window.location.pathname.replace(/\/+$/, '') || '/'
}

const Reports = lazy(() => import('./components/Reports.jsx'))

const TABS = [
  { id: 'dashboard', label: 'Monitoreo', desc: 'Tiempo real', Icon: IconChart },
  { id: 'reportes', label: 'Reportes', desc: 'Gráficas y CSV', Icon: IconReport },
  { id: 'ocr', label: 'Captura OCR', desc: 'Foto LCD', Icon: IconCamera },
  { id: 'voz', label: 'Captura voz', desc: 'Dictar lectura', Icon: IconMic },
]

const PILARES = [
  'Monitoreo en tiempo real',
  'Decisiones basadas en datos',
  'Más productividad, menos recursos',
]

export default function App() {
  const ruta = rutaLimpia()
  if (ruta === '/aws') return <CharlaAws />
  if (ruta === '/community-day') {
    const params = new URLSearchParams(window.location.search)
    if (params.get('reto') === '1' || params.get('sala')) {
      return <RetoJugador codigoInicial={params.get('sala') || ''} />
    }
    return <CharlaPresentacion />
  }
  return <Aplicacion />
}

function Aplicacion() {
  const [tab, setTab] = useState('dashboard')

  return (
    <div className="min-h-screen flex flex-col">
      <header className="relative border-b border-dark-border bg-dark">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, rgb(164 198 57 / 0.12), transparent 50%)`,
          }}
          aria-hidden
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-dark-panel ring-1 ring-lime/30">
                  <IconLogo className="w-11 h-11 text-lime" />
                </div>
                <div>
                  <h1 className="text-brand-title text-3xl sm:text-4xl leading-none">
                    <span className="text-white">ALISA</span>
                    <span className="text-lime">GRO</span>
                  </h1>
                  <p className="text-dark-muted text-sm mt-2 max-w-md leading-relaxed">
                    Sistema IoT para el monitoreo inteligente de cultivos
                  </p>
                </div>
              </div>

              <ul className="hidden md:flex flex-col gap-1.5 text-right text-xs text-dark-muted max-w-xs lg:max-w-sm">
                {PILARES.map((p) => (
                  <li key={p} className="flex items-center justify-end gap-2">
                    <span className="h-1 w-1 rounded-full bg-lime shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <nav className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-dark-panel ring-1 ring-dark-border w-full">
              {TABS.map(({ id, label, desc, Icon }) => {
                const activo = tab === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={`flex flex-1 sm:flex-initial items-center gap-3 px-4 sm:px-5 py-3 rounded-xl text-left transition-all duration-200 ${
                      activo
                        ? 'bg-lime text-dark shadow-lg shadow-lime/20'
                        : 'text-white/80 hover:bg-dark-elevated hover:text-white'
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        activo ? 'bg-dark/20 text-dark' : 'bg-lime/10 text-lime'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold leading-tight">{label}</span>
                      <span
                        className={`block text-[11px] mt-0.5 ${
                          activo ? 'text-dark/70' : 'text-dark-muted'
                        }`}
                      >
                        {desc}
                      </span>
                    </span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'reportes' && (
          <Suspense
            fallback={
              <div className="py-16 text-center text-dark-muted">
                <span className="inline-block h-10 w-10 rounded-full border-4 border-lime border-t-transparent animate-spin" />
                <p className="mt-4 text-sm">Cargando reportes…</p>
              </div>
            }
          >
            <Reports />
          </Suspense>
        )}
        {tab === 'ocr' && <OcrScanner />}
        {tab === 'voz' && <VoiceCapture />}
      </main>

      <footer className="mt-auto border-t border-dark-border bg-dark-panel py-5">
        <p className="text-center text-xs text-dark-muted font-medium">
          <span className="text-white font-bold">ALISA</span>
          <span className="text-lime font-bold">GRO</span>
          {' · '}
          Tecnología que transforma el campo en información
        </p>
      </footer>
    </div>
  )
}
