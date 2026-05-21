import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'
const MODELO = 'whisper-large-v3-turbo'

/** Mismo contrato que api/transcribe.js para npm run dev */
function pluginGroqDev() {
  return {
    name: 'groq-transcribe-dev',
    configureServer(server) {
      server.middlewares.use('/api/transcribe', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 200
          res.end()
          return
        }
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Use POST' }))
          return
        }

        const env = loadEnv(server.config.mode, server.config.envDir, '')
        const apiKey = env.GROQ_API_KEY
        if (!apiKey) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error: 'Falta GROQ_API_KEY en .env — gratis en console.groq.com',
            })
          )
          return
        }

        let cuerpo = ''
        req.on('data', (c) => {
          cuerpo += c
        })
        req.on('end', async () => {
          try {
            const { audio, mime = 'audio/webm' } = JSON.parse(cuerpo)
            const buffer = Buffer.from(audio, 'base64')
            const archivo = new Blob([buffer], { type: mime })
            const fd = new FormData()
            fd.append('file', archivo, 'lectura.webm')
            fd.append('model', MODELO)
            fd.append('language', 'es')
            fd.append('response_format', 'json')
            fd.append('temperature', '0')

            const groq = await fetch(GROQ_URL, {
              method: 'POST',
              headers: { Authorization: `Bearer ${apiKey}` },
              body: fd,
            })
            const texto = await groq.text()
            res.setHeader('Content-Type', 'application/json')
            if (!groq.ok) {
              res.statusCode = groq.status
              res.end(JSON.stringify({ error: texto.slice(0, 400) }))
              return
            }
            const json = JSON.parse(texto)
            res.statusCode = 200
            res.end(JSON.stringify({ text: json.text ?? '' }))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err?.message ?? 'Error' }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), pluginGroqDev()],
})
