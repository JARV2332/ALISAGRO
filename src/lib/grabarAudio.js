/**
 * Graba audio del micrófono con MediaRecorder (mismo camino que la prueba de nivel).
 */

function mimeGrabacion() {
  if (typeof MediaRecorder === 'undefined') return null
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus'
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
  if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4'
  return ''
}

export function grabarDesdeStream(stream, segundos = 8, { onTick } = {}) {
  const mime = mimeGrabacion()
  if (!mime) throw new Error('MediaRecorder no disponible en este navegador.')

  return new Promise((resolve, reject) => {
    const recorder = new MediaRecorder(stream, { mimeType: mime })
    const trozos = []

    recorder.ondataavailable = (ev) => {
      if (ev.data?.size) trozos.push(ev.data)
    }
    recorder.onerror = () => reject(new Error('Error al grabar audio'))
    recorder.onstop = () => {
      resolve(new Blob(trozos, { type: mime }))
    }

    let restante = segundos
    onTick?.(restante)
    const intervalo = window.setInterval(() => {
      restante -= 1
      onTick?.(Math.max(0, restante))
    }, 1000)

    recorder.start(200)
    window.setTimeout(() => {
      window.clearInterval(intervalo)
      if (recorder.state === 'recording') recorder.stop()
    }, segundos * 1000)
  })
}

export async function abrirMicYGrabar(segundos = 8, opciones = {}) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Micrófono no disponible en este navegador.')
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
  })
  try {
    return await grabarDesdeStream(stream, segundos, opciones)
  } finally {
    stream.getTracks().forEach((t) => t.stop())
  }
}
