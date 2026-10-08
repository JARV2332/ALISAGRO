import { mapReading } from './mapReading.mjs'

export const handler = async (event) => {
  const mapped = mapReading(event)
  if (!mapped.ok) {
    console.warn(JSON.stringify({ ok: false, error: mapped.error }))
    return { ok: false, error: mapped.error }
  }

  const baseUrl = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_KEY
  const table = process.env.SUPABASE_TABLE || 'ali_lecturas_aws_demo'

  if (!baseUrl || !key) {
    console.error('Faltan SUPABASE_URL o SUPABASE_KEY')
    throw new Error('Configuración incompleta')
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/rest/v1/${table}`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(mapped.row),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error(JSON.stringify({ status: response.status, body: body.slice(0, 500) }))
    throw new Error(`Supabase respondió ${response.status}`)
  }

  console.log(JSON.stringify({ ok: true, row: mapped.row }))
  return { ok: true }
}
