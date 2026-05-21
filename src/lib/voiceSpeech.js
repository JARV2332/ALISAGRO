/** Web Speech API — Chrome/Edge envían audio a Google (requiere internet) */

export const IDIOMAS_VOZ = ['es-MX', 'es-ES', 'es-CO', 'es-US']

export function vozDisponible() {
  if (typeof window === 'undefined') return false
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

export function contextoSeguro() {
  if (typeof window === 'undefined') return false
  return (
    window.isSecureContext ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  )
}

export async function solicitarPermisoMicrofono() {
  if (!navigator.mediaDevices?.getUserMedia) return false
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((t) => t.stop())
    return true
  } catch {
    return false
  }
}

/** Nueva instancia cada vez (Chrome falla si se reutiliza mal tras onend) */
export function crearReconocimientoVoz(idioma = 'es-MX') {
  const Clase = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!Clase) return null
  const rec = new Clase()
  rec.lang = idioma
  rec.continuous = true
  rec.interimResults = true
  rec.maxAlternatives = 1
  return rec
}

export function mensajeErrorVoz(codigo) {
  const mapa = {
    'no-speech': 'No se detectó voz. Hable más fuerte o más cerca del micrófono.',
    'not-allowed': 'Micrófono bloqueado. Permítalo en el navegador y en Windows.',
    network:
      'Sin conexión a internet. Chrome necesita red para convertir voz a texto (servicio de Google).',
    'audio-capture': 'No hay micrófono disponible o está en uso por otra app.',
    aborted: 'Detenido.',
    'service-not-allowed': 'Servicio de voz no permitido en este navegador.',
  }
  return mapa[codigo] ?? `Error: ${codigo}`
}
