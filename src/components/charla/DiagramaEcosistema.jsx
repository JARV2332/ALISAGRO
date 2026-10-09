const AWS = '/charla'

function imagen(src, clase = 'h-10 w-10 object-contain') {
  return <img src={src} alt="" className={clase} />
}

function Ficha({ encendida, fondo, icono, titulo, detalle }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-black/10 transition duration-500 ${
        encendida ? 'opacity-100' : 'opacity-30'
      }`}
    >
      <span
        className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl"
        style={{ background: fondo }}
      >
        {icono}
      </span>
      <span className="min-w-0 text-left">
        <span className="block text-sm font-bold leading-tight text-neutral-900">{titulo}</span>
        <span className="mt-0.5 block text-xs leading-snug text-neutral-500">{detalle}</span>
      </span>
    </div>
  )
}

function Zona({ titulo, children, clase = '' }) {
  return (
    <section className={`rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-3 ${clase}`}>
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">{titulo}</p>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

/** Diagrama de esta charla. `paso` enciende las piezas de 0 en adelante; 99 las deja todas. */
export default function DiagramaEcosistema({ paso = 99, completo = true }) {
  const prende = (n) => paso >= n

  return (
    <div className="rounded-[28px] bg-[#f6f3ec] p-4 text-neutral-900 shadow-card sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
          AWS Cloud · Norte de Virginia · us-east-1
        </p>
        <p className="text-xs text-neutral-500">Extendemos ALISAGRO. No lo movemos de casa.</p>
      </div>

      <div className="grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1.15fr_auto_1fr]">
        <Zona titulo="Parcela">
          <Ficha
            encendida={prende(0)}
            fondo="#a4c639"
            titulo="Planta"
            detalle="Ahí empieza todo"
            icono={<span className="text-2xl leading-none">🌱</span>}
          />
          <Ficha
            encendida={prende(1)}
            fondo="#0e7c86"
            titulo="Wemos + sensores"
            detalle="Humedad, temperatura, suelo"
            icono={imagen(`${AWS}/arduino.svg`, 'h-7 w-7 brightness-0 invert')}
          />
        </Zona>

        <Flecha texto="publica" visible={prende(2)} />

        <section className="rounded-2xl border-2 border-dashed border-[#f59e0b]/80 bg-[#fff8ee] p-3">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#b45309]">
            Dentro de AWS
          </p>
          <div className="space-y-2">
            <Ficha
              encendida={prende(2)}
              fondo="#232f3e"
              titulo="AWS IoT Core"
              detalle="Entra el dispositivo"
              icono={imagen(`${AWS}/iot-core.svg`)}
            />
            <Ficha
              encendida={prende(3)}
              fondo="#232f3e"
              titulo="Lambda"
              detalle="Revisa el evento y lo entrega"
              icono={imagen(`${AWS}/lambda.svg`)}
            />
            {completo && (
            <Ficha
              encendida={prende(7)}
              fondo="#232f3e"
              titulo="Amazon S3"
              detalle="La foto que envía la Pi"
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

        <Zona titulo="Lo que ALISAGRO ya tenía">
          <Ficha
            encendida={prende(4)}
            fondo="#3ecf8e"
            titulo="Supabase"
            detalle="Tabla de la charla"
            icono={imagen(`${AWS}/supabase.svg`, 'h-7 w-7 brightness-0 invert')}
          />
          <Ficha
            encendida={prende(5)}
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
        </Zona>
      </div>

      {completo && (
      <div className="mt-3 grid gap-3 lg:grid-cols-[1.4fr_auto_1fr]">
        <Zona titulo="Al lado de la planta · edge">
          <Ficha
            encendida={prende(6)}
            fondo="#c51a4a"
            titulo="Raspberry Pi 5 + cámara"
            detalle="Mira la planta aquí, en el lugar"
            icono={imagen(`${AWS}/raspberrypi.svg`, 'h-7 w-7 brightness-0 invert')}
          />
          <p className={`text-xs leading-relaxed text-neutral-600 transition ${prende(6) ? 'opacity-100' : 'opacity-30'}`}>
            Verde, amarillo y seco son indicadores visuales. La cámara no nombra una enfermedad.
            Los sensores dicen qué está pasando. La Pi dice qué se está viendo.
          </p>
        </Zona>
        <Flecha texto="foto" visible={prende(7)} />
        <Zona titulo="Evidencia">
          <Ficha
            encendida={prende(7)}
            fondo="#232f3e"
            titulo="La imagen queda en S3"
            detalle="Bitácora de la parcela, con hora"
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
      className={`hidden flex-col items-center justify-center gap-1 lg:flex ${visible ? 'opacity-100' : 'opacity-25'}`}
      aria-hidden
    >
      <span className="text-2xl font-bold text-neutral-400">→</span>
      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{texto}</span>
    </div>
  )
}

function Mini({ nombre, src }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white px-2 py-1.5 ring-1 ring-black/10">
      <img src={src} alt="" className="h-8 w-8 object-contain" />
      <span className="text-xs font-bold text-neutral-800">{nombre}</span>
    </div>
  )
}
