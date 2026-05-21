/**
 * Proxy Groq Whisper (clave solo en servidor: GROQ_API_KEY).
 * El cliente envía JSON { audio: base64, mime }.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'
const MODELO = 'whisper-large-v3-turbo'

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' })

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return res.status(500).json({
      error: 'Falta GROQ_API_KEY. Agréguela en .env (local) o en Vercel → Environment Variables.',
    })
  }

  const { audio, mime = 'audio/webm' } = req.body ?? {}
  if (!audio || typeof audio !== 'string') {
    return res.status(400).json({ error: 'Falta audio en base64' })
  }

  try {
    const buffer = Buffer.from(audio, 'base64')
    if (buffer.length < 500) {
      return res.status(400).json({ error: 'Audio demasiado corto' })
    }

    const archivo = new Blob([buffer], { type: mime })
    const cuerpo = new FormData()
    cuerpo.append('file', archivo, 'lectura.webm')
    cuerpo.append('model', MODELO)
    cuerpo.append('language', 'es')
    cuerpo.append('response_format', 'json')
    cuerpo.append('temperature', '0')

    const groq = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: cuerpo,
    })

    const texto = await groq.text()
    if (!groq.ok) {
      return res.status(groq.status).json({ error: texto.slice(0, 400) })
    }

    const json = JSON.parse(texto)
    return res.status(200).json({ text: json.text ?? '' })
  } catch (err) {
    return res.status(500).json({ error: err?.message ?? 'Error al transcribir' })
  }
}
