import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ALI_DEVICE_OCR,
  ALI_METODO_OCR,
  ALI_TABLA_LECTURAS,
} from '../lib/alisagroConfig.js'
import { abrirMicYGrabar } from '../lib/grabarAudio.js'
import { extraerValoresLcd } from '../lib/ocrParse.js'
import { abrirMicParaNivel, cerrarMicNivel, leerNivelMic } from '../lib/micNivel.js'
import { transcribirConGroq } from '../lib/groqStt.js'
import {
  contextoSeguro,
  crearReconocimientoVoz,
  IDIOMAS_VOZ,
  mensajeErrorVoz,
  solicitarPermisoMicrofono,
  vozDisponible,
} from '../lib/voiceSpeech.js'
import { supabase } from '../lib/supabaseClient.js'
import MensajeEstado from './MensajeEstado.jsx'
import { IconMic } from './Icons.jsx'
import VoiceVisualizer from './VoiceVisualizer.jsx'

export default function VoiceCapture() {
  const transcripcionRef = useRef('')
  const debeEscucharRef = useRef(false)
  const recVozRef = useRef(null)
  const arrancarVozRef = useRef(() => {})
  const micRef = useRef(null)
  const animMicRef = useRef(null)

  const [fase, setFase] = useState('idle')
  const [pasoMic, setPasoMic] = useState('pendiente')
  const [nivelMic, setNivelMic] = useState(0)
  const [vozSoportada, setVozSoportada] = useState(false)
  const [seguro, setSeguro] = useState(true)
  const [idioma, setIdioma] = useState('es-MX')
  const [transcripcion, setTranscripcion] = useState('')
  const [cuentaGrabacion, setCuentaGrabacion] = useState(0)
  const [mostrarGoogle, setMostrarGoogle] = useState(false)
  const [textoManual, setTextoManual] = useState('Temperatura 50 grados humedad 30 por ciento')
  const [textoDetectado, setTextoDetectado] = useState('')
  const [tempAmbiente, setTempAmbiente] = useState('')
  const [humedadAmbiente, setHumedadAmbiente] = useState('')
  const [estado, setEstado] = useState('idle')
  const [mensaje, setMensaje] = useState('')
  const [logVoz, setLogVoz] = useState([])

  const agregarLog = useCallback((linea) => {
    const hora = new Date().toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    setLogVoz((prev) => [`[${hora}] ${linea}`, ...prev].slice(0, 10))
  }, [])

  useEffect(() => {
    setVozSoportada(vozDisponible())
    setSeguro(contextoSeguro())
  }, [])

  const detenerAnimacionMic = useCallback(() => {
    if (animMicRef.current) {
      cancelAnimationFrame(animMicRef.current)
      animMicRef.current = null
    }
  }, [])

  const detenerMicNivel = useCallback(() => {
    detenerAnimacionMic()
    if (micRef.current) {
      cerrarMicNivel(micRef.current)
      micRef.current = null
    }
  }, [detenerAnimacionMic])

  const detenerEscuchaGoogle = useCallback(() => {
    debeEscucharRef.current = false
    try {
      recVozRef.current?.abort()
    } catch {
      /* ok */
    }
    recVozRef.current = null
  }, [])

  const detenerTodo = useCallback(() => {
    detenerEscuchaGoogle()
    detenerMicNivel()
  }, [detenerEscuchaGoogle, detenerMicNivel])

  useEffect(() => () => detenerTodo(), [detenerTodo])

  const aplicarTexto = useCallback((texto) => {
    const limpio = texto.trim()
    setTextoDetectado(limpio)
    transcripcionRef.current = limpio
    setTranscripcion(limpio)

    const { temp_ambiente, humedad_ambiente } = extraerValoresLcd(limpio, { esVoz: true })
    if (temp_ambiente !== null) setTempAmbiente(String(temp_ambiente))
    if (humedad_ambiente !== null) setHumedadAmbiente(String(humedad_ambiente))

    setFase('listo')
    setEstado('listo')

    if (!limpio) {
      setMensaje('Sin texto. Hable más fuerte, use el cuadro manual o grabe de nuevo.')
      return
    }

    setMensaje(
      temp_ambiente !== null || humedad_ambiente !== null
        ? `Detectado: «${limpio}». Revise y guarde.`
        : `Texto «${limpio}» sin números claros. Corrija abajo.`
    )
  }, [])

  const probarMicrofono = async () => {
    detenerMicNivel()
    setPasoMic('probando')
    setMensaje('Probando micrófono… hable ahora')
    setEstado('escuchando')
    agregarLog('Iniciando prueba de micrófono')

    try {
      micRef.current = await abrirMicParaNivel()
      let maxNivel = 0
      let frames = 0

      const loop = () => {
        if (!micRef.current) return
        const n = leerNivelMic(micRef.current.analizador)
        setNivelMic(n)
        if (n > maxNivel) maxNivel = n
        frames += 1
        if (frames < 120) {
          animMicRef.current = requestAnimationFrame(loop)
        } else {
          detenerMicNivel()
          if (maxNivel >= 8) {
            setPasoMic('ok')
            setMensaje(`Micrófono OK (nivel ${maxNivel}%). Ya puede grabar su lectura.`)
            setEstado('listo')
            agregarLog(`Micrófono OK, pico ${maxNivel}%`)
          } else {
            setPasoMic('bajo')
            setMensaje(
              `Micrófono muy bajo (pico ${maxNivel}%). Suba volumen en Windows, acerque el mic o use texto manual.`
            )
            setEstado('error')
            agregarLog(`Micrófono débil, pico ${maxNivel}%`)
          }
        }
      }
      animMicRef.current = requestAnimationFrame(loop)
    } catch (err) {
      setPasoMic('error')
      setEstado('error')
      setMensaje('No se pudo abrir el micrófono. Permítalo en Windows y en el navegador.')
      agregarLog(`Error mic: ${err?.message ?? err}`)
      detenerMicNivel()
    }
  }

  const grabarYTranscribir = async () => {
    if (!seguro) {
      setEstado('error')
      setMensaje('Abra con localhost o https (no archivo HTML directo).')
      return
    }
    if (pasoMic !== 'ok') {
      setMensaje('Primero pulse «Probar micrófono» y verifique que la barra se mueve.')
      setEstado('error')
      return
    }

    detenerEscuchaGoogle()
    transcripcionRef.current = ''
    setTranscripcion('')
    setFase('grabando')
    setEstado('escuchando')
    setCuentaGrabacion(8)
    setMensaje('Grabando 8 s… diga temperatura y humedad con números.')
    agregarLog('Grabación (8 s)')

    try {
      const blob = await abrirMicYGrabar(8, {
        onTick: (s) => setCuentaGrabacion(s),
      })
      agregarLog(`Audio: ${Math.round(blob.size / 1024)} KB`)

      setFase('transcribiendo')
      setEstado('procesando')
      setMensaje('Transcribiendo con Groq…')

      const texto = await transcribirConGroq(blob, {
        onProgreso: (msg) => {
          setMensaje(msg)
          agregarLog(msg)
        },
      })

      agregarLog(texto ? `Groq: ${texto}` : 'Groq: sin texto')
      aplicarTexto(texto)
    } catch (err) {
      setFase('idle')
      setEstado('error')
      const msg = err?.message ?? String(err)
      setMensaje(msg)
      agregarLog(`Error: ${msg}`)
    }
  }

  const arrancarMotorVoz = useCallback(() => {
    if (!debeEscucharRef.current || !vozSoportada) return

    try {
      recVozRef.current?.abort()
    } catch {
      /* ok */
    }

    const rec = crearReconocimientoVoz(idioma)
    if (!rec) return
    recVozRef.current = rec

    rec.onstart = () => {
      agregarLog('Motor STT Google: activo')
      setMensaje('Google STT (internet). Hable: 50 grados, 30 por ciento.')
    }

    rec.onresult = (evento) => {
      let trozo = ''
      for (let i = evento.resultIndex; i < evento.results.length; i += 1) {
        trozo += evento.results[i][0].transcript
      }
      if (!trozo.trim()) return

      const nuevo = `${transcripcionRef.current} ${trozo}`.replace(/\s+/g, ' ').trim()
      transcripcionRef.current = nuevo
      setTranscripcion(nuevo)
      agregarLog(`Google oído: ${trozo.trim()}`)

      const parcial = extraerValoresLcd(nuevo, { esVoz: true })
      if (parcial.temp_ambiente !== null) setTempAmbiente(String(parcial.temp_ambiente))
      if (parcial.humedad_ambiente !== null) setHumedadAmbiente(String(parcial.humedad_ambiente))
    }

    rec.onerror = (evento) => {
      agregarLog(`Error Google STT: ${evento.error}`)
      if (evento.error === 'no-speech' && debeEscucharRef.current) return
      if (evento.error === 'aborted') return
      setMensaje(mensajeErrorVoz(evento.error))
      if (['not-allowed', 'audio-capture', 'network'].includes(evento.error)) {
        debeEscucharRef.current = false
        setFase('idle')
        setEstado('error')
      }
    }

    rec.onend = () => {
      recVozRef.current = null
      if (!debeEscucharRef.current) return
      window.setTimeout(() => arrancarVozRef.current(), 400)
    }

    try {
      rec.start()
    } catch (err) {
      agregarLog(`Google start falló: ${err?.message}`)
      debeEscucharRef.current = false
      setFase('idle')
    }
  }, [agregarLog, idioma, vozSoportada])

  useEffect(() => {
    arrancarVozRef.current = arrancarMotorVoz
  }, [arrancarMotorVoz])

  const iniciarGoogleStt = async () => {
    if (!vozSoportada) return
    const micPermiso = await solicitarPermisoMicrofono()
    if (!micPermiso) {
      setEstado('error')
      setMensaje('Permiso de micrófono denegado.')
      return
    }

    transcripcionRef.current = ''
    setTranscripcion('')
    setFase('google')
    setEstado('escuchando')
    debeEscucharRef.current = true
    agregarLog(`Sesión Google STT (${idioma})`)
    arrancarMotorVoz()
  }

  const finalizarGoogle = () => {
    debeEscucharRef.current = false
    detenerEscuchaGoogle()
    setFase('procesando')
    setEstado('procesando')
    agregarLog('Procesando texto Google')
    window.setTimeout(() => aplicarTexto(transcripcionRef.current), 300)
  }

  const cancelarGoogle = () => {
    debeEscucharRef.current = false
    detenerEscuchaGoogle()
    setFase('idle')
    setEstado('idle')
    agregarLog('Google cancelado')
  }

  const interpretarManual = () => {
    detenerTodo()
    setFase('procesando')
    agregarLog('Texto manual')
    window.setTimeout(() => aplicarTexto(textoManual), 200)
  }

  const guardarLectura = async () => {
    const temp = parseFloat(tempAmbiente)
    const hum = parseFloat(humedadAmbiente)
    if (Number.isNaN(temp) || Number.isNaN(hum)) {
      setEstado('error')
      setMensaje('Ingrese temperatura y humedad.')
      return
    }
    setEstado('guardando')
    const { error } = await supabase.from(ALI_TABLA_LECTURAS).insert({
      device_id: ALI_DEVICE_OCR,
      temp_suelo: null,
      humedad_suelo: null,
      temp_ambiente: temp,
      humedad_ambiente: hum,
      metodo_captura: ALI_METODO_OCR,
    })
    if (error) {
      setEstado('error')
      setMensaje(error.message)
      return
    }
    setEstado('exito')
    setMensaje('¡Guardado!')
  }

  const grabando = fase === 'grabando'
  const transcribiendo = fase === 'transcribiendo' || fase === 'procesando'
  const googleActivo = fase === 'google'
  const ocupado = estado === 'guardando' || transcribiendo

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">Captura por voz</h2>
        <p className="text-dark-muted mt-2 text-sm">
          Paso 1: probar micrófono. Paso 2: <strong className="text-lime">grabar 8 s</strong> — Groq Whisper
          (gratis, ~2 s). Requiere <code className="text-lime/90">GROQ_API_KEY</code> en .env / Vercel.
        </p>
      </div>

      <section className="card p-4 ring-1 ring-sky-500/30 bg-sky-500/5 text-sm space-y-2">
        <h3 className="font-bold text-sky-200">Configurar Groq (una vez, gratis)</h3>
        <ol className="list-decimal list-inside text-dark-muted space-y-1">
          <li>
            Cuenta en{' '}
            <a href="https://console.groq.com" target="_blank" rel="noreferrer" className="text-sky-300 underline">
              console.groq.com
            </a>
          </li>
          <li>API Keys → Create API Key</li>
          <li>
            En la carpeta del proyecto, archivo <code className="text-white/80">.env</code>:{' '}
            <code className="text-white/80">GROQ_API_KEY=gsk_...</code>
          </li>
          <li>Reiniciar <code className="text-white/80">npm run dev</code> (Ctrl+C y volver a arrancar)</li>
        </ol>
      </section>

      <section className="card p-5 space-y-4 ring-1 ring-lime/20">
        <h3 className="font-bold text-white text-sm">Paso 1 — ¿El micrófono funciona?</h3>
        <div className="h-3 rounded-full bg-dark-elevated overflow-hidden ring-1 ring-dark-border">
          <div
            className="h-full bg-lime transition-all duration-75 rounded-full"
            style={{ width: `${Math.max(4, nivelMic)}%` }}
          />
        </div>
        <p className="text-xs text-dark-muted">
          La barra verde debe subir al hablar. Estado:{' '}
          <span className="text-lime font-semibold">{pasoMic}</span>
        </p>
        <button type="button" onClick={probarMicrofono} className="btn-secondary" disabled={pasoMic === 'probando'}>
          Probar micrófono (3 s)
        </button>
      </section>

      <section className="card p-5 space-y-4 ring-2 ring-lime/30">
        <h3 className="font-bold text-white text-sm">Paso 2 — Grabar lectura (recomendado)</h3>

        {transcribiendo ? (
          <div className="py-8 text-center">
            <span className="inline-block h-12 w-12 rounded-full border-4 border-lime border-t-transparent animate-spin" />
            <p className="mt-3 text-white font-medium">{mensaje || 'Transcribiendo…'}</p>
          </div>
        ) : (
          <>
            <VoiceVisualizer
              activo={grabando}
              etiqueta={grabando ? `Grabando… ${cuentaGrabacion}s` : 'Listo para grabar'}
            />
            <div className="rounded-xl bg-dark-elevated px-4 py-3 ring-1 ring-dark-border min-h-[3rem]">
              <p className="text-[10px] uppercase font-bold text-dark-muted mb-1">Transcripción (Groq)</p>
              <p className={`text-sm ${transcripcion ? 'text-white' : 'text-dark-muted italic'}`}>
                {transcripcion ||
                  (grabando
                    ? 'Hable ahora: «temperatura cincuenta grados humedad treinta por ciento»'
                    : 'Pulse grabar y hable al final del conteo')}
              </p>
            </div>
            <p className="text-xs text-dark-muted">
              Ejemplo: <em className="text-white/80">temperatura 50 grados humedad 30 por ciento</em>
            </p>
            <button
              type="button"
              onClick={grabarYTranscribir}
              disabled={pasoMic !== 'ok' || grabando || ocupado}
              className="btn-primary w-full sm:w-auto"
            >
              <IconMic className="w-5 h-5" />
              {grabando ? `Grabando ${cuentaGrabacion}s…` : 'Grabar 8 segundos y transcribir'}
            </button>
          </>
        )}
      </section>

      <details
        className="card p-4 ring-1 ring-dark-border"
        open={mostrarGoogle}
        onToggle={(e) => setMostrarGoogle(e.target.open)}
      >
        <summary className="cursor-pointer text-sm font-bold text-dark-muted">
          Alternativa: Google STT (internet, a veces falla)
        </summary>
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-3 items-center text-xs text-dark-muted">
            <span>STT Google: {vozSoportada ? '✓' : '✗'}</span>
            <select
              value={idioma}
              onChange={(e) => setIdioma(e.target.value)}
              disabled={googleActivo}
              className="rounded-lg bg-dark-elevated border border-dark-border px-2 py-1 text-white"
            >
              {IDIOMAS_VOZ.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>
          {!googleActivo ? (
            <button
              type="button"
              onClick={iniciarGoogleStt}
              disabled={!vozSoportada || pasoMic !== 'ok'}
              className="btn-secondary text-sm"
            >
              Iniciar Google STT
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={finalizarGoogle} className="btn-primary text-sm">
                Procesar Google
              </button>
              <button type="button" onClick={cancelarGoogle} className="btn-secondary text-sm">
                Detener
              </button>
            </div>
          )}
        </div>
      </details>

      <section className="card p-5 ring-2 ring-amber-500/30 bg-amber-500/5 space-y-3">
        <h3 className="font-bold text-amber-200">Respaldo — escribir a mano</h3>
        <textarea
          value={textoManual}
          onChange={(e) => setTextoManual(e.target.value)}
          rows={2}
          className="input-field text-base w-full"
        />
        <button type="button" onClick={interpretarManual} className="btn-primary w-full sm:w-auto">
          Interpretar y llenar campos
        </button>
      </section>

      <MensajeEstado estado={estado} mensaje={mensaje} />

      {logVoz.length > 0 && (
        <details className="card px-4 py-3 text-xs">
          <summary className="cursor-pointer text-dark-muted font-bold">Diagnóstico técnico</summary>
          <ul className="mt-2 space-y-1 font-mono text-dark-muted">
            {logVoz.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </details>
      )}

      <section className="card p-6 space-y-4 ring-1 ring-lime/15">
        <h3 className="font-bold text-white">Validar y guardar</h3>
        {textoDetectado && (
          <p className="text-xs text-dark-muted">
            Último texto: <span className="text-white">{textoDetectado}</span>
          </p>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs text-lime/80 font-bold uppercase">Temp °C</span>
            <input
              type="number"
              value={tempAmbiente}
              onChange={(e) => setTempAmbiente(e.target.value)}
              className="input-field mt-1 w-full"
            />
          </label>
          <label className="block">
            <span className="text-xs text-lime/80 font-bold uppercase">Hum %</span>
            <input
              type="number"
              value={humedadAmbiente}
              onChange={(e) => setHumedadAmbiente(e.target.value)}
              className="input-field mt-1 w-full"
            />
          </label>
        </div>
        <button type="button" onClick={guardarLectura} disabled={ocupado} className="btn-primary w-full py-3">
          Guardar lectura
        </button>
      </section>
    </div>
  )
}
