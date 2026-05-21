import { IconCheck } from './Icons.jsx'

export default function MensajeEstado({ estado, mensaje }) {
  if (!mensaje) return null

  const estilos = {
    exito: 'bg-lime/10 border-lime/40 text-lime',
    error: 'bg-red-500/10 border-red-500/40 text-red-300',
    procesando: 'bg-dark-elevated border-lime/30 text-white',
    guardando: 'bg-dark-elevated border-lime/30 text-white',
    listo: 'bg-dark-elevated border-dark-border text-dark-muted',
    idle: 'bg-dark-panel border-dark-border text-dark-muted',
    escuchando: 'bg-lime/5 border-lime/30 text-lime',
  }

  return (
    <div
      className={`rounded-2xl border px-5 py-4 text-sm font-medium flex items-start gap-3 ${estilos[estado] ?? estilos.idle}`}
      role="status"
    >
      {(estado === 'procesando' || estado === 'guardando') && (
        <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-lime border-t-transparent animate-spin" />
      )}
      {estado === 'exito' && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime text-dark">
          <IconCheck className="w-4 h-4" />
        </span>
      )}
      <span className="leading-relaxed">{mensaje}</span>
    </div>
  )
}
