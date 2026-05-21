/** Convierte números hablados en español a cifras (cincuenta → 50) */

const PALABRAS_BASE = {
  cero: 0,
  uno: 1,
  una: 1,
  un: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90,
  cien: 100,
  ciento: 100,
}

const DECENAS = {
  veinte: 20,
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90,
}

function normalizarTextoVoz(texto) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bpor\s*ciento\b/g, ' porciento ')
    .replace(/\bgrados?\s*(centigrados?|celsius)?\b/g, ' grados ')
}

/** "veinticinco" / "veinte y cinco" → 25 */
function palabraCompuestaANumero(palabra) {
  const p = palabra.replace(/\s+/g, '').replace(/y/g, '')

  const veinti = p.match(/^veinti(.+)$/)
  if (veinti) {
    const u = PALABRAS_BASE[veinti[1]] ?? DECENAS[veinti[1]]
    if (u !== undefined && u < 10) return 20 + u
  }

  const treinta = p.match(/^treinta(.+)$/)
  if (treinta && treinta[1]) {
    const u = PALABRAS_BASE[treinta[1]]
    if (u !== undefined && u < 10) return 30 + u
  }

  const cuarenta = p.match(/^cuarenta(.+)$/)
  if (cuarenta && cuarenta[1]) {
    const u = PALABRAS_BASE[cuarenta[1]]
    if (u !== undefined && u < 10) return 40 + u
  }

  const cincuenta = p.match(/^cincuenta(.+)$/)
  if (cincuenta && cincuenta[1]) {
    const u = PALABRAS_BASE[cincuenta[1]]
    if (u !== undefined && u < 10) return 50 + u
  }

  if (PALABRAS_BASE[p] !== undefined) return PALABRAS_BASE[p]

  const partes = palabra.split(/\s+y\s+|\s+/).filter(Boolean)
  if (partes.length === 2 && DECENAS[partes[0]] !== undefined) {
    const u = PALABRAS_BASE[partes[1]]
    if (u !== undefined && u < 10) return DECENAS[partes[0]] + u
  }

  return null
}

function extraerNumeroDeFragmento(fragmento) {
  const frag = fragmento.trim()
  if (!frag) return null

  const digito = frag.match(/(\d+(?:[.,]\d+)?)/)
  if (digito) {
    const n = parseFloat(digito[1].replace(',', '.'))
    if (!Number.isNaN(n) && n >= -40 && n <= 100) return n
  }

  const palabras = frag.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)

  for (let i = 0; i < palabras.length; i += 1) {
    const sola = palabras[i]
    if (PALABRAS_BASE[sola] !== undefined) return PALABRAS_BASE[sola]

    const compuesta = palabras.slice(i, i + 3).join(' ')
    const n = palabraCompuestaANumero(compuesta.replace(/\s+/g, ''))
    if (n !== null) return n

    const conY = palabras.slice(i, i + 3).join(' ')
    const n2 = palabraCompuestaANumero(conY)
    if (n2 !== null) return n2
  }

  const todo = frag.replace(/[^a-z\s]/g, ' ')
  const nTodo = palabraCompuestaANumero(todo.replace(/\s+/g, ''))
  if (nTodo !== null) return nTodo

  return null
}

/**
 * Extrae temp y humedad de frase hablada (dígitos o palabras).
 */
export function extraerValoresVoz(textoCrudo) {
  const textoDetectado = textoCrudo.trim()
  if (!textoDetectado) {
    return { temp_ambiente: null, humedad_ambiente: null, textoDetectado: '' }
  }

  const limpio = normalizarTextoVoz(textoDetectado)

  let temp_ambiente = null
  let humedad_ambiente = null

  const idxHum = limpio.search(/\bhumedad\b|\bhum\b/)
  const idxTemp = limpio.search(/\btemperatura\b|\btemp\b/)

  if (idxTemp >= 0) {
    const fin = idxHum >= 0 && idxHum > idxTemp ? idxHum : limpio.length
    const trozo = limpio.slice(idxTemp, fin)
    temp_ambiente = extraerNumeroDeFragmento(trozo)
  }

  if (idxHum >= 0) {
    const trozo = limpio.slice(idxHum)
    humedad_ambiente = extraerNumeroDeFragmento(trozo)
  }

  if (temp_ambiente === null || humedad_ambiente === null) {
    const sinPalabras = limpio
      .replace(/\btemperatura\b/g, ' ')
      .replace(/\btemp\b/g, ' ')
      .replace(/\bhumedad\b/g, ' ')
      .replace(/\bhum\b/g, ' ')
      .replace(/\bgrados?\b/g, ' ')
      .replace(/\bporciento\b/g, ' ')
      .replace(/\bde\b/g, ' ')

    const tokens = sinPalabras.split(/\s+/).filter(Boolean)
    const numeros = []

    for (const token of tokens) {
      const n = extraerNumeroDeFragmento(token)
      if (n !== null) numeros.push(n)
    }

    if (temp_ambiente === null && numeros.length > 0) temp_ambiente = numeros[0]
    if (humedad_ambiente === null && numeros.length > 1) humedad_ambiente = numeros[1]
  }

  return { temp_ambiente, humedad_ambiente, textoDetectado }
}
