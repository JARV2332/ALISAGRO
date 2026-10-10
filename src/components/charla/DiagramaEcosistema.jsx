import { Mic, Sprout } from 'lucide-react'

const AWS = '/charla'

function imagen(src, clase = 'h-10 w-10 object-contain') {
  return <img src={src} alt="" className={clase} />
}

function Ficha({ encendida, activa, fondo, icono, titulo, detalle }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl bg-[#232323] px-3 py-2 shadow-[0_10px_28px_rgb(0_0_0/0.35)] ring-1 ring-white/10 transition duration-500 ${
        encendida ? 'opacity-100' : 'opacity-30'
      } ${activa ? 'ring-2 ring-[#a4c639] shadow-[0_0_32px_rgb(164_198_57/0.45)]' : ''}`}
    >
      <span
        className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl"
        style={{ background: fondo }}
      >
        {icono}
      </span>
      <span className="min-w-0 text-left">
        <span className="block text-lg font-bold leading-tight text-white">{titulo}</span>
        <span className="mt-0.5 block text-lg leading-snug text-white/70">{detalle}</span>
      </span>
    </div>
  )
}

function Zona({ titulo, children, clase = '' }) {
  return (
    <section className={`rounded-2xl border border-dashed border-white/20 bg-[#141414] p-3 ${clase}`}>
      <p className="mb-2 text-lg font-bold uppercase tracking-[0.12em] text-white/55">{titulo}</p>
      <div className="space-y-1.5">{children}</div>
    </section>
  )
}

/** Diagrama de esta charla. `paso` enciende las piezas de 0 en adelante; 99 las deja todas. */
export default function DiagramaEcosistema({ paso = 99, completo = true }) {
  const prende = (n) => paso >= n
  const activa = (n) => paso < 90 && paso === n

  return (
    <div className="w-full rounded-[28px] bg-[#1a1a1a] p-3 text-white shadow-[0_18px_50px_rgb(0_0_0/0.4)] ring-1 ring-white/10 sm:p-4">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <p className="text-lg font-bold uppercase tracking-[0.14em] text-white/55">
          AWS Cloud · Norte de Virginia · us-east-1
        </p>
        <p className="text-lg text-white/60">Extendemos ALISAGRO. No lo movemos de casa.</p>
      </div>

      <div className="grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1.15fr_auto_1fr]">
        <Zona titulo="Parcela">
          <Ficha
            encendida={prende(0)}
            activa={activa(0)}
            fondo="#a4c639"
            titulo="Planta"
            detalle="Ahí empieza todo"
            icono={<Sprout size={26} strokeWidth={2} className="text-[#121212]" />}
          />
          <Ficha
            encendida={prende(1)}
            activa={activa(1)}
            fondo="#0e7c86"
            titulo="Wemos + sensores"
            detalle="Suelo, aire y hojas"
            icono={imagen(`${AWS}/arduino.svg`, 'h-7 w-7 brightness-0 invert')}
          />
        </Zona>

        <Flecha texto="publica" visible={prende(2)} />

        <section className="rounded-2xl border-2 border-dashed border-[#FF9900] bg-[#1a1a1a] p-3">
          <p className="mb-3 text-lg font-bold uppercase tracking-[0.14em] text-[#FF9900]">
            Dentro de AWS
          </p>
          <div className="space-y-2">
            <Ficha
              encendida={prende(2)}
              activa={activa(2)}
              fondo="#232f3e"
              titulo="AWS IoT Core"
              detalle="Entra el dispositivo"
              icono={imagen(`${AWS}/iot-core.svg`)}
            />
            <Ficha
              encendida={prende(3)}
              activa={activa(3)}
              fondo="#232f3e"
              titulo="Lambda"
              detalle="Revisa el evento"
              icono={imagen(`${AWS}/lambda.svg`)}
            />
            {completo && (
            <Ficha
              encendida={prende(7)}
              activa={activa(7)}
              fondo="#232f3e"
              titulo="Amazon S3"
              detalle="Foto de la Pi"
              icono={imagen(`${AWS}/s3.svg`)}
            />
            )}
          </div>
          <div className={`mt-3 flex gap-2 transition ${prende(2) ? 'opacity-100' : 'opacity-30'}`}>
            <Mini nombre="IAM" src={`${AWS}/iam.svg`} />
            <Mini nombre="CloudWatch" src={`${AWS}/cloudwatch.svg`} />
          </div>
        </section>

        <Flecha texto="escribe" visible={prende(4)} />

        <Zona titulo="Quién consulta la planta">
          <Ficha
            encendida={prende(4)}
            activa={activa(4)}
            fondo="#3ecf8e"
            titulo="Supabase"
            detalle="Tabla de la charla"
            icono={imagen(`${AWS}/supabase.svg`, 'h-7 w-7 brightness-0 invert')}
          />
          <Ficha
            encendida={prende(5)}
            activa={activa(5)}
            fondo="#f3f4f6"
            titulo="ALISAGRO"
            detalle="React en Vercel"
            icono={
              <span className="flex items-center gap-1">
                {imagen(`${AWS}/react.svg`, 'h-6 w-6')}
                {imagen(`${AWS}/vercel.svg`, 'h-4 w-4')}
              </span>
            }
          />
          <Ficha
            encendida={prende(6)}
            activa={activa(6)}
            fondo="#00CAFF"
            titulo="Alexa"
            detalle="Lambda lee y responde"
            icono={<Mic size={26} strokeWidth={2} className="text-[#121212]" />}
          />
        </Zona>
      </div>

      {completo && (
      <div className="mt-3 grid gap-3 lg:grid-cols-[1.4fr_auto_1fr]">
        <Zona titulo="Al lado de la planta · edge">
          <Ficha
            encendida={prende(6)}
            activa={activa(6)}
            fondo="#c51a4a"
            titulo="Raspberry Pi 5 + cámara"
            detalle="Mira la planta en el lugar"
            icono={imagen(`${AWS}/raspberrypi.svg`, 'h-7 w-7 brightness-0 invert')}
          />
        </Zona>
        <Flecha texto="foto" visible={prende(7)} />
        <Zona titulo="Evidencia">
          <Ficha
            encendida={prende(7)}
            activa={activa(7)}
            fondo="#232f3e"
            titulo="La imagen queda en S3"
            detalle="Bitácora con hora"
            icono={imagen(`${AWS}/s3.svg`)}
          />
        </Zona>
      </div>
      )}
    </div>
  )
}

function Flecha({ texto, visible }) {
  return (
    <div
      className={`hidden flex-col items-center justify-center gap-1 lg:flex ${visible ? 'opacity-100' : 'opacity-30'}`}
      aria-hidden
    >
      <span className="text-3xl font-bold text-[#FF9900]">→</span>
      <span className="text-lg font-bold uppercase tracking-wider text-white/55">{texto}</span>
    </div>
  )
}

function Mini({ nombre, src }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-[#232323] px-3 py-2 ring-1 ring-white/10">
      <img src={src} alt="" className="h-8 w-8 object-contain" />
      <span className="text-lg font-bold text-white">{nombre}</span>
    </div>
  )
}
