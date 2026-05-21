/**
 * Transcripción vía Groq Whisper (gratis con cuenta en console.groq.com).
 * Llama a /api/transcribe (Vercel o proxy de Vite en dev) — la clave no va al navegador.
 */

async function blobABase64(blob) {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binario = ''
  const trozo = 0x8000
  for (let i = 0; i < bytes.length; i += trozo) {
    binario += String.fromCharCode(...bytes.subarray(i, i + trozo))
  }
  return btoa(binario)
}

export async function transcribirConGroq(blob, { onProgreso } = {}) {
  if (!blob || blob.size < 500) {
    throw new Error('Grabación muy corta. Hable más cerca del micrófono.')
  }

  onProgreso?.('Enviando audio a Groq (Whisper, gratis)…')

  const audio = await blobABase64(blob)
  const res = await fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio, mime: blob.type || 'audio/webm' }),
  })

  let data = {}
  try {
    data = await res.json()
  } catch {
    data = { error: await res.text() }
  }

  if (!res.ok) {
    const msg = data.error ?? `Error ${res.status}`
    if (msg.includes('GROQ_API_KEY')) {
      throw new Error(
        'Configure GROQ_API_KEY en .env (local) o Vercel. Clave gratis: console.groq.com → API Keys'
      )
    }
    throw new Error(msg)
  }

  return (data.text ?? '').trim()
}
