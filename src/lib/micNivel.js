/**
 * Comprueba que el micrófono captura audio (independiente de SpeechRecognition).
 */

export async function abrirMicParaNivel() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('getUserMedia no disponible')
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
    },
  })
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  const analizador = ctx.createAnalyser()
  analizador.fftSize = 256
  const fuente = ctx.createMediaStreamSource(stream)
  fuente.connect(analizador)

  return { stream, ctx, analizador }
}

export function leerNivelMic(analizador) {
  const datos = new Uint8Array(analizador.frequencyBinCount)
  analizador.getByteFrequencyData(datos)
  let suma = 0
  for (let i = 0; i < datos.length; i += 1) suma += datos[i]
  const promedio = suma / datos.length
  return Math.min(100, Math.round((promedio / 128) * 100))
}

export function cerrarMicNivel({ stream, ctx }) {
  stream?.getTracks().forEach((t) => t.stop())
  ctx?.close().catch(() => {})
}
