import { extraerValoresVoz } from './vozParse.js'

/**
 * Extrae temperatura y humedad del texto OCR (LCD, etiquetas o nota escrita).
 * Siempre conviene validar manualmente antes de guardar.
 */
export function extraerValoresLcd(textoCrudo, { esVoz = false } = {}) {
  let textoDetectado = textoCrudo.trim()
  if (!textoDetectado) {
    return { temp_ambiente: null, humedad_ambiente: null, textoDetectado: '' }
  }

  if (esVoz) {
    return extraerValoresVoz(textoDetectado)
  }

  const sinAcentos = textoDetectado
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  const limpio = sinAcentos
    .replace(/[oO](?=\s*[c%°]|\s*$)/g, '0')
    .replace(/[lI|](?=\d|\s|$)/g, '1')
    .replace(/,/g, '.')

  let temp_ambiente = null
  let humedad_ambiente = null

  const parseNum = (s) => {
    const n = parseFloat(s)
    return !Number.isNaN(n) && n >= -40 && n <= 100 ? n : null
  }

  // Etiqueta + número en la misma línea o cerca
  const mTempEtiqueta = limpio.match(/temp(?:eratura)?\s*[:\-]?\s*(\d+(?:\.\d+)?)/)
  const mHumEtiqueta = limpio.match(/hum(?:edad)?\s*[:\-]?\s*(\d+(?:\.\d+)?)/)
  if (mTempEtiqueta) temp_ambiente = parseNum(mTempEtiqueta[1])
  if (mHumEtiqueta) humedad_ambiente = parseNum(mHumEtiqueta[1])

  // Etiqueta en una línea y número en la siguiente (notas a mano)
  if (temp_ambiente === null) {
    const mTempCerca = limpio.match(/temp(?:eratura)?[\s\S]{0,48}?(\d+(?:\.\d+)?)/)
    if (mTempCerca) temp_ambiente = parseNum(mTempCerca[1])
  }
  if (humedad_ambiente === null) {
    const mHumCerca = limpio.match(/hum(?:edad)?[\s\S]{0,48}?(\d+(?:\.\d+)?)/)
    if (mHumCerca) humedad_ambiente = parseNum(mHumCerca[1])
  }

  // Número + símbolo (20°, 65%)
  if (temp_ambiente === null) {
    const mGrados = limpio.match(/(\d+(?:\.\d+)?)\s*(?:°|º|grados|\bc\b)/)
    if (mGrados) temp_ambiente = parseNum(mGrados[1])
  }
  if (humedad_ambiente === null) {
    const mPct = limpio.match(/(\d+(?:\.\d+)?)\s*%/)
    if (mPct) humedad_ambiente = parseNum(mPct[1])
  }

  // Fallback: primer y segundo número en el texto
  const candidatos = limpio.replace(/[^\d.\s%-]/g, ' ').match(/\d+(?:\.\d+)?/g) ?? []
  const numeros = candidatos.map(parseNum).filter((n) => n !== null)

  if (temp_ambiente === null && numeros.length > 0) temp_ambiente = numeros[0]
  if (humedad_ambiente === null && numeros.length > 1) humedad_ambiente = numeros[1]

  return { temp_ambiente, humedad_ambiente, textoDetectado }
}

/** Texto de ayuda para mostrar en la UI */
export const FORMATO_OCR_AYUDA = {
  ideal: 'Pantalla LCD del termómetro (números grandes y nítidos)',
  manuscrito: [
    'TEMP 26.5',
    'HUM 65',
  ],
  alternativo: ['26.5 °C', '65 %'],
  voz: 'Temperatura 26 grados humedad 65 por ciento',
}
