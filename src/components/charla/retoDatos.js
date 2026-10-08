export const SEGUNDOS_PREGUNTA = 8
export const PUNTOS_COMPLETOS = 1000

export const COLORES_RETO = ['bg-[#e21b3c]', 'bg-[#1368ce]', 'bg-[#d89e00]', 'bg-[#26890c]']
export const FORMAS_RETO = ['▲', '◆', '●', '■']

export const AVATARES = [
  { id: 'brote', etiqueta: 'Brote', emoji: '🌱' },
  { id: 'hoja', etiqueta: 'Hoja', emoji: '🌿' },
  { id: 'cactus', etiqueta: 'Cactus', emoji: '🌵' },
  { id: 'flor', etiqueta: 'Flor', emoji: '🌸' },
  { id: 'maceta', etiqueta: 'Maceta', emoji: '🪴' },
  { id: 'trigo', etiqueta: 'Trigo', emoji: '🌾' },
  { id: 'iot', etiqueta: 'IoT Core', src: '/charla/iot-core.svg' },
  { id: 'lambda', etiqueta: 'Lambda', src: '/charla/lambda.svg' },
  { id: 's3', etiqueta: 'S3', src: '/charla/s3.svg' },
  { id: 'cloudwatch', etiqueta: 'CloudWatch', src: '/charla/cloudwatch.svg' },
  { id: 'iam', etiqueta: 'IAM', src: '/charla/iam.svg' },
  { id: 'react', etiqueta: 'React', src: '/charla/react.svg', claro: true },
  { id: 'supabase', etiqueta: 'Supabase', src: '/charla/supabase.svg', claro: true },
  { id: 'raspberry', etiqueta: 'Raspberry', src: '/charla/raspberrypi.svg', claro: true },
  { id: 'python', etiqueta: 'Python', src: '/charla/python.svg', claro: true },
  { id: 'arduino', etiqueta: 'Arduino', src: '/charla/arduino.svg', claro: true },
]

export function avatarDe(id) {
  return AVATARES.find((item) => item.id === id) || AVATARES[0]
}

const PREGUNTAS = [
  {
    texto: '¿Qué servicio recibe los datos del dispositivo?',
    opciones: ['S3', 'Lambda', 'IoT Core', 'CloudWatch'],
    correcta: 2,
  },
  {
    texto: '¿Dónde miramos la planta, antes de subir nada a la nube?',
    opciones: ['En AWS', 'En la Raspberry Pi', 'En Supabase', 'En Vercel'],
    correcta: 1,
  },
  {
    texto: '¿Qué hace Lambda en esta charla?',
    opciones: [
      'Guarda las fotos',
      'Procesa el evento y lo entrega',
      'Alimenta la planta',
      'Reemplaza al Wemos',
    ],
    correcta: 1,
  },
  {
    texto: '¿Cuál frase es la de esta charla?',
    opciones: [
      'Migramos ALISAGRO a AWS',
      'Extendimos ALISAGRO con AWS',
      'Reemplazamos Supabase',
      'La cámara diagnostica la enfermedad',
    ],
    correcta: 1,
  },
  {
    texto: 'Si el suelo está seco, ¿quién lo dice?',
    opciones: ['La foto', 'El sensor de humedad', 'CloudWatch', 'El navegador'],
    correcta: 1,
  },
]

function barajar(lista) {
  const copia = [...lista]
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

export function armarMazo() {
  const cartas = barajar(PREGUNTAS).map((pregunta) => {
    const opciones = barajar(pregunta.opciones)
    return {
      texto: pregunta.texto,
      opciones,
      correcta: opciones.indexOf(pregunta.opciones[pregunta.correcta]),
    }
  })
  return {
    mazo: cartas.map(({ texto, opciones }) => ({ texto, opciones })),
    clave: cartas.map((carta) => carta.correcta),
  }
}

export function codigoSala() {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(4))
  return [...bytes].map((byte) => alfabeto[byte % alfabeto.length]).join('')
}

export function segundosRestantes(empieza) {
  if (!empieza) return SEGUNDOS_PREGUNTA
  const fin = new Date(empieza).getTime() + SEGUNDOS_PREGUNTA * 1000
  return Math.max(0, Math.ceil((fin - Date.now()) / 1000))
}

export function faltaLaSala(error) {
  const texto = `${error?.code || ''} ${error?.message || ''}`
  return /ali_reto_sala|ali_reto_mandar|PGRST202|PGRST205|42P01|schema cache/i.test(texto)
}

const CLAVE_ANFITRION = 'alisagro-reto-anfitrion'
const CLAVE_JUGADOR = 'alisagro-reto-jugador'

export function leerAnfitrion() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_ANFITRION) || 'null')
  } catch {
    return null
  }
}

export function guardarAnfitrion(dato) {
  localStorage.setItem(CLAVE_ANFITRION, JSON.stringify(dato))
}

export function olvidarAnfitrion() {
  localStorage.removeItem(CLAVE_ANFITRION)
}

export function leerJugador() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_JUGADOR) || 'null')
  } catch {
    return null
  }
}

export function guardarJugador(dato) {
  localStorage.setItem(CLAVE_JUGADOR, JSON.stringify(dato))
}

export function olvidarJugador() {
  localStorage.removeItem(CLAVE_JUGADOR)
}
