import { useCallback, useEffect, useRef, useState } from 'react'
import { createWorker } from 'tesseract.js'
import {
  ALI_DEVICE_OCR,
  ALI_METODO_OCR,
  ALI_TABLA_LECTURAS,
} from '../lib/alisagroConfig.js'
import { supabase } from '../lib/supabaseClient.js'
import { extraerValoresLcd, FORMATO_OCR_AYUDA } from '../lib/ocrParse.js'
import { IconCamera, IconUpload } from './Icons.jsx'
import MensajeEstado from './MensajeEstado.jsx'

export { extraerValoresLcd } from '../lib/ocrParse.js'

export default function OcrScanner() {
  const workerRef = useRef(null)
  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [textoOcr, setTextoOcr] = useState('')
  const [tempAmbiente, setTempAmbiente] = useState('')
  const [humedadAmbiente, setHumedadAmbiente] = useState('')
  const [estado, setEstado] = useState('idle')
  const [mensaje, setMensaje] = useState('')
  const [workerListo, setWorkerListo] = useState(false)
  /** cerrada | cargando | abierta */
  const [modoCamara, setModoCamara] = useState('cerrada')
  const [camaraSoportada, setCamaraSoportada] = useState(true)

  useEffect(() => {
    setCamaraSoportada(
      typeof navigator !== 'undefined' &&
        !!navigator.mediaDevices?.getUserMedia &&
        (window.isSecureContext ||
          window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1')
    )
  }, [])

  const aplicarTextoOcr = useCallback((texto) => {
    const textoLimpio = texto.trim()
    setTextoOcr(textoLimpio)

    const { temp_ambiente, humedad_ambiente } = extraerValoresLcd(textoLimpio)

    if (temp_ambiente !== null) setTempAmbiente(String(temp_ambiente))
    if (humedad_ambiente !== null) setHumedadAmbiente(String(humedad_ambiente))

    setEstado('listo')
    setMensaje(
      temp_ambiente !== null || humedad_ambiente !== null
        ? 'Valores detectados. Revise y pulse Guardar lectura cuando estén correctos.'
        : 'No se detectaron números claros. Ingrese los valores manualmente.'
    )
  }, [])

  useEffect(() => {
    let cancelado = false

    async function iniciarWorker() {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text' && m.progress) {
            const pct = Math.round(m.progress * 100)
            setMensaje(`Reconociendo dígitos… ${pct}%`)
            setEstado('procesando')
          }
        },
      })
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789.%°CFcfRHrh:- ',
        tessedit_pageseg_mode: '6',
      })
      if (!cancelado) {
        workerRef.current = worker
        setWorkerListo(true)
        setMensaje('')
      } else {
        await worker.terminate()
      }
    }

    iniciarWorker()
    return () => {
      cancelado = true
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [])

  const liberarPreview = useCallback((url) => {
    if (url) URL.revokeObjectURL(url)
  }, [])

  const detenerCamara = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setModoCamara('cerrada')
  }, [])

  useEffect(() => () => detenerCamara(), [detenerCamara])

  /** Conecta el stream al <video> cuando el elemento ya está en el DOM */
  useEffect(() => {
    if (modoCamara !== 'abierta' || !streamRef.current) return

    const video = videoRef.current
    const stream = streamRef.current
    if (!video) return

    video.srcObject = stream
    let cancelado = false

    video
      .play()
      .then(() => {
        if (!cancelado) {
          setMensaje('Enfoque la pantalla LCD y pulse «Capturar foto».')
        }
      })
      .catch((err) => {
        console.error(err)
        if (!cancelado) {
          setEstado('error')
          setMensaje('No se pudo mostrar la vista de cámara. Pruebe «Elegir imagen».')
          detenerCamara()
        }
      })

    return () => {
      cancelado = true
      if (video.srcObject === stream) {
        video.srcObject = null
      }
    }
  }, [modoCamara, detenerCamara])

  async function solicitarStreamCamara() {
    const base = { audio: false }
    try {
      return await navigator.mediaDevices.getUserMedia({
        ...base,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
    } catch (err1) {
      console.warn('Cámara trasera no disponible, probando cámara por defecto…', err1)
      return navigator.mediaDevices.getUserMedia({
        ...base,
        video: true,
      })
    }
  }

  const procesarImagen = useCallback(
    async (file) => {
      if (!file || !workerRef.current) return

      detenerCamara()
      setEstado('procesando')
      setMensaje('Procesando imagen…')

      const url = URL.createObjectURL(file)
      setPreviewUrl((prev) => {
        liberarPreview(prev)
        return url
      })

      try {
        const { data } = await workerRef.current.recognize(file)
        aplicarTextoOcr(data?.text ?? '')
      } catch (err) {
        console.error(err)
        setEstado('error')
        setMensaje('Error al procesar la imagen. Intente otra foto con mejor luz y enfoque.')
      }
    },
    [aplicarTextoOcr, detenerCamara, liberarPreview]
  )

  const iniciarCamara = async () => {
    if (!camaraSoportada) {
      setEstado('error')
      setMensaje(
        'La cámara en vivo requiere HTTPS o localhost. Use «Elegir imagen» o abra la app con npm run dev.'
      )
      return
    }

    detenerCamara()
    setEstado('idle')
    setMensaje('Solicitando acceso a la cámara…')
    setModoCamara('cargando')

    try {
      const stream = await solicitarStreamCamara()
      streamRef.current = stream
      setModoCamara('abierta')
    } catch (err) {
      console.error(err)
      detenerCamara()

      const nombre = err?.name ?? ''
      if (nombre === 'NotAllowedError' || nombre === 'PermissionDeniedError') {
        setEstado('error')
        setMensaje(
          'Permiso de cámara denegado. Actívelo en la configuración del navegador o use «Elegir imagen».'
        )
      } else if (nombre === 'NotFoundError' || nombre === 'DevicesNotFoundError') {
        setEstado('error')
        setMensaje('No se encontró cámara en este dispositivo. Use «Elegir imagen».')
      } else if (nombre === 'NotReadableError' || nombre === 'TrackStartError') {
        setEstado('error')
        setMensaje(
          'La cámara está en uso por otra aplicación (Zoom, Teams, etc.). Ciérrela e intente de nuevo.'
        )
      } else {
        setEstado('error')
        setMensaje(
          `No se pudo abrir la cámara (${nombre || 'error'}). Use «Elegir imagen» como alternativa.`
        )
      }
    }
  }

  const capturarFoto = async () => {
    const video = videoRef.current
    if (!video || modoCamara !== 'abierta') return

    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) {
      setEstado('error')
      setMensaje('Espere a que la cámara enfoque e intente de nuevo.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, w, h)

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setEstado('error')
          setMensaje('No se pudo capturar la imagen.')
          return
        }
        const file = new File([blob], `lcd-${Date.now()}.jpg`, { type: 'image/jpeg' })
        procesarImagen(file)
      },
      'image/jpeg',
      0.92
    )
  }

  const onSeleccionarArchivo = (e) => {
    const file = e.target.files?.[0]
    if (file) procesarImagen(file)
    e.target.value = ''
  }

  const guardarLectura = async () => {
    const temp = parseFloat(tempAmbiente)
    const hum = parseFloat(humedadAmbiente)

    if (Number.isNaN(temp) || Number.isNaN(hum)) {
      setEstado('error')
      setMensaje('Ingrese temperatura y humedad ambiente válidas antes de guardar.')
      return
    }

    setEstado('guardando')
    setMensaje('Guardando en la nube…')

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
      setMensaje(`Error al guardar: ${error.message}`)
      return
    }

    setEstado('exito')
    setMensaje('¡Datos guardados con éxito! El dashboard se actualizará al instante.')
  }

  const reiniciar = () => {
    detenerCamara()
    setPreviewUrl((prev) => {
      liberarPreview(prev)
      return null
    })
    setTextoOcr('')
    setTempAmbiente('')
    setHumedadAmbiente('')
    setEstado('idle')
    setMensaje('')
  }

  const ocupado = estado === 'procesando' || estado === 'guardando'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center sm:text-left">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
          Captura OCR (foto)
        </h2>
        <p className="text-dark-muted mt-2 text-sm leading-relaxed max-w-lg">
          Fotografíe la pantalla LCD o suba una imagen. OCR con{' '}
          <strong className="text-lime/90">Tesseract</strong> (gratis). Para dictar use la pestaña{' '}
          <strong className="text-lime/90">Captura voz</strong>.
        </p>
      </div>

      <div className="card px-5 py-4 text-sm border-lime/20 bg-dark-elevated/40 space-y-3">
        <p className="font-bold text-lime text-xs uppercase tracking-wider">
          Cómo escribir o fotografiar para mejores lecturas
        </p>
        <p className="text-dark-muted leading-relaxed">
          <strong className="text-white/90">Ideal:</strong> {FORMATO_OCR_AYUDA.ideal}
        </p>
        <div>
          <p className="text-dark-muted mb-2">
            <strong className="text-white/90">A mano</strong> (letra de imprenta, grande, dos líneas):
          </p>
          <pre className="font-mono text-lime/90 bg-dark rounded-lg px-4 py-3 text-base leading-relaxed ring-1 ring-dark-border">
            {FORMATO_OCR_AYUDA.manuscrito.join('\n')}
          </pre>
          <p className="text-xs text-dark-muted mt-2">
            Palabras clave: <span className="text-white/80">TEMP</span> o{' '}
            <span className="text-white/80">Temperatura</span> · <span className="text-white/80">HUM</span>{' '}
            o <span className="text-white/80">Humedad</span>. Números entre -40 y 100.
          </p>
        </div>
        <p className="text-xs text-amber-200/90 leading-relaxed">
          Su foto solo decía «Temperatura» y «20°»: puede leer la temperatura (20), pero la humedad
          hay que escribirla en una segunda línea (ej. HUM 65). La letra muy cursiva o borrosa falla
          más que números grandes tipo LCD.
        </p>
      </div>

      {!workerListo && (
        <div className="card px-5 py-4 flex items-center gap-3 border-amber-500/30 bg-amber-500/5">
          <span className="h-5 w-5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin shrink-0" />
          <p className="text-sm font-medium text-amber-200">
            Inicializando Tesseract OCR… (primera carga puede tardar unos segundos)
          </p>
        </div>
      )}

      <div className="card overflow-hidden border-2 border-dashed border-lime/35 bg-lime/5">
        {modoCamara !== 'cerrada' ? (
          <div className="relative bg-black min-h-[240px] sm:min-h-[320px]">
            <video
              ref={videoRef}
              className={`w-full max-h-[min(70vh,420px)] min-h-[240px] object-cover bg-black ${
                modoCamara === 'cargando' ? 'opacity-0' : 'opacity-100'
              }`}
              playsInline
              muted
              autoPlay
            />
            {modoCamara === 'cargando' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-dark-panel">
                <span className="h-10 w-10 rounded-full border-4 border-lime border-t-transparent animate-spin" />
                <p className="text-sm font-medium text-white">Conectando cámara…</p>
                <p className="text-xs text-dark-muted px-6 text-center">
                  Si el navegador lo pide, pulse «Permitir» para usar la cámara
                </p>
              </div>
            )}
            {modoCamara === 'abierta' && (
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  disabled={!workerListo || ocupado}
                  onClick={capturarFoto}
                  className="btn-primary flex-1 min-w-[140px] max-w-xs"
                >
                  <IconCamera className="w-5 h-5" />
                  Capturar foto
                </button>
                <button
                  type="button"
                  onClick={detenerCamara}
                  className="btn-secondary"
                  disabled={ocupado}
                >
                  Cerrar cámara
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 sm:p-10 text-center">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-lime/15 flex items-center justify-center text-lime mb-5 ring-2 ring-lime/25">
              <IconCamera className="w-10 h-10" />
            </div>
            <p className="font-display font-bold text-lg text-white">Foto de la pantalla LCD</p>
            <p className="text-sm text-dark-muted mt-2 mb-6 max-w-xs mx-auto">
              Enfoque la pantalla del termómetro con buena iluminación
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                disabled={!workerListo || ocupado}
                onClick={iniciarCamara}
                className="btn-primary"
              >
                <IconCamera className="w-5 h-5" />
                Abrir cámara en vivo
              </button>
              <button
                type="button"
                disabled={!workerListo || ocupado}
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary"
              >
                <IconUpload className="w-5 h-5" />
                Elegir imagen
              </button>
            </div>
            {!camaraSoportada && (
              <p className="text-xs text-amber-300/90 mt-4 max-w-sm mx-auto">
                Sin HTTPS la cámara en vivo puede estar bloqueada; «Elegir imagen» sigue funcionando.
              </p>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onSeleccionarArchivo}
      />

      {previewUrl && (
        <div className="card overflow-hidden p-0 ring-1 ring-lime/20">
          <div className="px-4 py-2 bg-dark-elevated text-lime text-xs font-bold uppercase tracking-wider border-b border-dark-border">
            Vista previa
          </div>
          <img
            src={previewUrl}
            alt="Vista previa pantalla LCD"
            className="w-full max-h-72 object-contain bg-black"
          />
        </div>
      )}

      <MensajeEstado estado={estado} mensaje={mensaje} />

      {textoOcr && (
        <details className="card px-4 py-3 text-xs group">
          <summary className="cursor-pointer font-bold text-lime uppercase tracking-wide list-none flex items-center gap-2">
            <span className="text-dark-muted group-open:rotate-90 transition-transform">▸</span>
            Texto OCR (Tesseract)
          </summary>
          <pre className="mt-3 whitespace-pre-wrap font-mono text-dark-muted bg-dark-elevated rounded-lg p-3 ring-1 ring-dark-border">
            {textoOcr}
          </pre>
        </details>
      )}

      <section className="card p-6 sm:p-8 space-y-5 ring-1 ring-lime/15">
        <div className="flex items-center gap-3 pb-2 border-b border-dark-border">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime text-dark text-sm font-bold">
            2
          </span>
          <div>
            <h3 className="font-display font-bold text-lg text-white">Validación manual</h3>
            <p className="text-xs text-dark-muted mt-0.5">
              Obligatoria — corrija cualquier dígito mal leído
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-lime/90">
              Temperatura ambiente
            </span>
            <div className="relative mt-2">
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                value={tempAmbiente}
                onChange={(e) => setTempAmbiente(e.target.value)}
                className="input-field pr-12"
                placeholder="24.5"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-muted font-bold">
                °C
              </span>
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-lime/90">
              Humedad ambiente
            </span>
            <div className="relative mt-2">
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                value={humedadAmbiente}
                onChange={(e) => setHumedadAmbiente(e.target.value)}
                className="input-field pr-10"
                placeholder="65"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-muted font-bold">
                %
              </span>
            </div>
          </label>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={guardarLectura}
            disabled={ocupado}
            className="btn-primary flex-1 py-3.5"
          >
            Guardar lectura
          </button>
          <button type="button" onClick={reiniciar} className="btn-secondary py-3.5">
            Nueva captura
          </button>
        </div>
      </section>
    </div>
  )
}
