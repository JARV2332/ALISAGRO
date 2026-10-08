import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient.js'
import {
  armarMazo,
  codigoSala,
  COLORES_RETO,
  faltaLaSala,
  FORMAS_RETO,
  guardarAnfitrion,
  guardarJugador,
  leerAnfitrion,
  leerJugador,
  olvidarAnfitrion,
  olvidarJugador,
  segundosRestantes,
  SEGUNDOS_PREGUNTA,
} from './retoDatos.js'

function ordenarGente(lista, porPuntaje) {
  return [...lista].sort((a, b) => {
    if (porPuntaje && b.puntaje !== a.puntaje) return b.puntaje - a.puntaje
    return new Date(a.created_at) - new Date(b.created_at)
  })
}

function useSala(codigo) {
  const [sala, setSala] = useState(null)
  const [jugadores, setJugadores] = useState([])
  const [respuestas, setRespuestas] = useState([])
  const [correcta, setCorrecta] = useState(null)
  const [error, setError] = useState(null)
  const [tick, setTick] = useState(0)
  const [cargada, setCargada] = useState(false)

  const cargar = useCallback(async () => {
    if (!supabase || !codigo) return
    const { data, error: errSala } = await supabase
      .from('ali_reto_sala')
      .select('id, codigo, estado, mazo, indice, pregunta_empieza')
      .eq('codigo', codigo)
      .maybeSingle()
    if (errSala) {
      setError(errSala)
      setSala(null)
      setCargada(true)
      return
    }
    setError(null)
    setSala(data)
    if (!data) {
      setJugadores([])
      setRespuestas([])
      setCorrecta(null)
      setCargada(true)
      return
    }
    const [{ data: gente }, { data: hechas }] = await Promise.all([
      supabase
        .from('ali_reto_jugador')
        .select('id, nombre, puntaje, created_at')
        .eq('sala_id', data.id),
      supabase
        .from('ali_reto_respuesta')
        .select('jugador_id, opcion')
        .eq('sala_id', data.id)
        .eq('indice', data.indice),
    ])
    setJugadores(gente ?? [])
    setRespuestas(hechas ?? [])
    if (data.estado === 'revelada' || data.estado === 'fin') {
      const { data: n } = await supabase.rpc('ali_reto_correcta', { p_codigo: codigo })
      setCorrecta(typeof n === 'number' ? n : null)
    } else {
      setCorrecta(null)
    }
    setCargada(true)
  }, [codigo])

  useEffect(() => {
    if (!codigo || !supabase) return undefined
    cargar()
    const canal = supabase
      .channel(`reto-${codigo}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ali_reto_sala' }, cargar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ali_reto_jugador' }, cargar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ali_reto_respuesta' }, cargar)
      .subscribe()
    const id = setInterval(cargar, 1500)
    return () => {
      clearInterval(id)
      supabase.removeChannel(canal)
    }
  }, [codigo, cargar])

  useEffect(() => {
    if (sala?.estado !== 'pregunta') return undefined
    const id = setInterval(() => setTick(Date.now()), 200)
    return () => clearInterval(id)
  }, [sala?.estado, sala?.pregunta_empieza])

  const segundos = useMemo(() => {
    void tick
    if (sala?.estado !== 'pregunta') return SEGUNDOS_PREGUNTA
    return segundosRestantes(sala.pregunta_empieza)
  }, [tick, sala])

  return { sala, jugadores, respuestas, correcta, error, segundos, cargar, cargada }
}

export function RetoAnfitrion() {
  const guardado = leerAnfitrion()
  const [codigo, setCodigo] = useState(guardado?.codigo || '')
  const [token, setToken] = useState(guardado?.anfitrion || '')
  const [aviso, setAviso] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const revelando = useRef(false)
  const { sala, jugadores, respuestas, correcta, error, segundos, cargada } = useSala(codigo)

  useEffect(() => {
    if (sala?.estado !== 'pregunta') revelando.current = false
  }, [sala?.estado])

  useEffect(() => {
    if (!supabase || !token || !codigo || sala?.estado !== 'pregunta' || segundos > 0 || revelando.current) return undefined
    revelando.current = true
    supabase
      .rpc('ali_reto_mandar', {
        p_codigo: codigo,
        p_token: token,
        p_estado: 'revelada',
        p_indice: sala.indice,
        p_empezar: false,
        p_mazo: null,
        p_clave: null,
      })
      .then(({ error: err }) => {
        if (err) setAviso('No pude revelar la respuesta.')
      })
    return undefined
  }, [segundos, sala?.estado, sala?.indice, token, codigo])

  async function mandar(estado, indice, empezar, mazo = null, clave = null) {
    const { data, error: err } = await supabase.rpc('ali_reto_mandar', {
      p_codigo: codigo,
      p_token: token,
      p_estado: estado,
      p_indice: indice,
      p_empezar: empezar,
      p_mazo: mazo,
      p_clave: clave,
    })
    if (err || !data) setAviso('No pude mover la sala. Si recargaste en otro navegador, crea una nueva.')
    else setAviso('')
  }

  async function crear() {
    if (!supabase) return
    setOcupado(true)
    setAviso('')
    const anfitrion = crypto.randomUUID()
    const { mazo, clave } = armarMazo()
    let nuevo = codigoSala()
    let creado = null
    let err = null
    for (let intento = 0; intento < 3 && !creado; intento += 1) {
      const respuesta = await supabase
        .from('ali_reto_sala')
        .insert({ codigo: nuevo, anfitrion, estado: 'lobby', mazo, clave, indice: 0 })
        .select('codigo')
        .single()
      creado = respuesta.data
      err = respuesta.error
      nuevo = codigoSala()
    }
    setOcupado(false)
    if (!creado) {
      setAviso(faltaLaSala(err) ? 'falta-sql' : 'No pude crear la sala.')
      return
    }
    guardarAnfitrion({ codigo: creado.codigo, anfitrion })
    setToken(anfitrion)
    setCodigo(creado.codigo)
  }

  async function limpiar() {
    setAviso('')
    const { error: err } = await supabase.rpc('ali_reto_limpiar', { p_codigo: codigo, p_token: token })
    if (err) setAviso('No pude borrar los resultados.')
  }

  async function cerrar() {
    setAviso('')
    const { error: err } = await supabase.rpc('ali_reto_cerrar', { p_codigo: codigo, p_token: token })
    if (err) {
      setAviso('No pude cerrar la sala.')
      return
    }
    olvidarAnfitrion()
    setCodigo('')
    setToken('')
  }

  async function otraVez() {
    const { mazo, clave } = armarMazo()
    await supabase.rpc('ali_reto_limpiar', { p_codigo: codigo, p_token: token })
    await mandar('lobby', 0, false, mazo, clave)
  }

  if (!supabase) {
    return <p className="text-white/70">Falta la conexión con Supabase en este navegador.</p>
  }

  const pregunta = sala?.mazo?.[sala.indice]
  const gente = ordenarGente(jugadores, sala?.estado === 'fin' || sala?.estado === 'revelada')
  const url = codigo ? `${window.location.origin}/community-day?sala=${codigo}` : ''

  if (!codigo) {
    return (
      <div className="mx-auto max-w-xl">
        <h2 className="font-display text-4xl font-bold">Tú mandas la sala</h2>
        <p className="mt-3 text-lg text-white/75">
          Creas la sala, ves los apodos cuando entren y das Iniciar. Los teléfonos contestan juntos.
        </p>
        <button type="button" className="btn-primary mt-6" onClick={crear} disabled={ocupado}>
          Crear sala
        </button>
        {aviso === 'falta-sql' && <AvisoSql />}
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-lime">Anfitrión</p>
        <h2 className="mt-1 font-display text-4xl font-bold tracking-widest">{codigo}</h2>
        {error && faltaLaSala(error) && <AvisoSql />}
        {aviso && aviso !== 'falta-sql' && <p className="mt-3 text-sm text-amber-200">{aviso}</p>}
        {cargada && !sala && !error && (
          <div className="mt-4">
            <p className="text-white/75">Esta sala ya no está.</p>
            <button
              type="button"
              className="btn-secondary mt-3"
              onClick={() => {
                olvidarAnfitrion()
                setCodigo('')
                setToken('')
              }}
            >
              Crear otra
            </button>
          </div>
        )}

        {sala?.estado === 'lobby' && (
          <div className="mt-6">
            <p className="text-xl text-white/80">
              {gente.length === 0 ? 'Cuando entren, el apodo aparece a la derecha.' : `${gente.length} en la sala.`}
            </p>
            <button
              type="button"
              className="btn-primary mt-5 px-8 py-4 text-lg"
              onClick={() => mandar('pregunta', 0, true)}
              disabled={!sala}
            >
              Iniciar
            </button>
          </div>
        )}

        {(sala?.estado === 'pregunta' || sala?.estado === 'revelada') && pregunta && (
          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-lime">
                {sala.indice + 1} / {sala.mazo.length}
              </p>
              <p className="text-sm text-white/70">
                Respondieron {respuestas.length} de {gente.length}
              </p>
            </div>
            <Cuenta segundos={sala.estado === 'pregunta' ? segundos : 0} />
            {sala.estado === 'pregunta' && segundos === 0 && (
              <p className="mt-2 text-sm font-bold text-amber-200">Se acabó el tiempo</p>
            )}
            <p className="mt-4 font-display text-2xl font-bold leading-snug sm:text-3xl">{pregunta.texto}</p>
            <Opciones pregunta={pregunta} elegida={sala.estado === 'revelada' ? correcta : null} />
            <div className="mt-4 flex flex-wrap gap-2">
              {sala.estado === 'pregunta' && (
                <button type="button" className="btn-secondary" onClick={() => mandar('revelada', sala.indice, false)}>
                  Revelar
                </button>
              )}
              {sala.estado === 'revelada' && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    const siguiente = sala.indice + 1
                    if (siguiente >= sala.mazo.length) mandar('fin', sala.indice, false)
                    else mandar('pregunta', siguiente, true)
                  }}
                >
                  {sala.indice + 1 >= sala.mazo.length ? 'Ver resultados' : 'Siguiente'}
                </button>
              )}
            </div>
          </div>
        )}

        {sala?.estado === 'fin' && (
          <div className="mt-6">
            <p className="font-display text-3xl font-bold">Resultados</p>
            <Podio gente={gente} />
            <button type="button" className="btn-primary mt-5" onClick={otraVez}>
              Jugar otra vez
            </button>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={limpiar}>
            Eliminar resultados
          </button>
          <button type="button" className="btn-secondary" onClick={cerrar}>
            Cerrar sala
          </button>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-3xl bg-white p-4 text-neutral-900">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">Entren con el teléfono</p>
          <CodigoQr valor={url} />
          <p className="mt-2 break-all text-xs font-semibold text-neutral-600">{url.replace(/^https?:\/\//, '')}</p>
        </div>
        <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-lime">En la sala · {gente.length}</p>
          {gente.length === 0 ? (
            <p className="mt-3 text-sm text-white/70">Todavía no entra nadie.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {gente.map((persona) => {
                const ya = respuestas.some((r) => r.jugador_id === persona.id)
                return (
                  <li key={persona.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${ya ? 'bg-lime' : 'bg-white/20'}`} />
                      {persona.nombre}
                    </span>
                    <span className="font-bold tabular-nums text-lime">{persona.puntaje}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  )
}

export function RetoJugador({ codigoInicial }) {
  const [codigo, setCodigo] = useState((codigoInicial || '').toUpperCase())
  const [buscando, setBuscando] = useState(!codigoInicial)
  const [yo, setYo] = useState(null)
  const [apodo, setApodo] = useState('')
  const [aviso, setAviso] = useState('')
  const [enviando, setEnviando] = useState(false)
  const { sala, jugadores, respuestas, correcta, error, segundos, cargada } = useSala(codigo)
  const pregunta = sala?.mazo?.[sala.indice]
  const mia = respuestas.find((r) => r.jugador_id === yo?.id)

  useEffect(() => {
    const previo = leerJugador()
    if (previo && (!codigoInicial || previo.codigo === codigoInicial.toUpperCase())) {
      setCodigo(previo.codigo)
      setYo({ id: previo.id, nombre: previo.nombre })
      setBuscando(false)
    }
  }, [codigoInicial])

  useEffect(() => {
    if (codigoInicial || !supabase) return undefined
    let vigente = true
    supabase
      .from('ali_reto_sala')
      .select('codigo, estado')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (!vigente) return
        if (err) {
          setAviso(faltaLaSala(err) ? 'falta-sql' : 'No hay sala abierta.')
          setBuscando(false)
          return
        }
        if (data?.codigo) setCodigo(data.codigo)
        else setAviso('El anfitrión todavía no abre la sala.')
        setBuscando(false)
      })
    return () => {
      vigente = false
    }
  }, [codigoInicial])

  useEffect(() => {
    document.title = 'ALISAGRO | Reto'
  }, [])

  async function entrar(evento) {
    evento.preventDefault()
    const nombre = apodo.trim().slice(0, 24)
    if (!nombre || !sala) return
    setEnviando(true)
    const { data, error: err } = await supabase
      .from('ali_reto_jugador')
      .insert({ sala_id: sala.id, nombre })
      .select('id, nombre')
      .single()
    setEnviando(false)
    if (!data) {
      setAviso(err?.code === '23505' ? 'Ese apodo ya está. Prueba con otro.' : 'Entra mientras la sala está en espera.')
      return
    }
    guardarJugador({ codigo: sala.codigo, id: data.id, nombre: data.nombre })
    setYo(data)
    setAviso('')
  }

  async function elegir(opcion) {
    if (!yo || mia || sala?.estado !== 'pregunta') return
    const { error: err } = await supabase.from('ali_reto_respuesta').insert({
      sala_id: sala.id,
      jugador_id: yo.id,
      indice: sala.indice,
      opcion,
      acierto: false,
    })
    if (err && err.code !== '23505') setAviso('No se guardó la respuesta.')
  }

  function salir() {
    olvidarJugador()
    setYo(null)
  }

  const gente = ordenarGente(jugadores, true)

  return (
    <div className="min-h-dvh bg-[#0e0e0e] px-4 py-6 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-lg flex-col">
        <img src="/charla/community-day.png" alt="AWS Community Day Guatemala" className="mx-auto h-16 w-auto" />
        <p className="mt-4 text-center text-sm font-bold uppercase tracking-[0.16em] text-lime">
          Sala {codigo || '…'}
        </p>

        {buscando && <p className="mt-10 text-center text-lg text-white/70">Buscando la sala…</p>}
        {aviso === 'falta-sql' && <AvisoSql />}
        {aviso && aviso !== 'falta-sql' && <p className="mt-4 text-center text-amber-200">{aviso}</p>}
        {error && faltaLaSala(error) && <AvisoSql />}

        {!buscando && sala && !yo && sala.estado === 'lobby' && (
          <form className="mt-8" onSubmit={entrar}>
            <label className="text-sm font-semibold text-white/70" htmlFor="apodo-sala">
              Tu apodo
            </label>
            <input
              id="apodo-sala"
              className="input-field mt-2"
              maxLength={24}
              value={apodo}
              placeholder="Cómo te ven en la pantalla"
              onChange={(evento) => setApodo(evento.target.value)}
            />
            <button type="submit" className="btn-primary mt-4 w-full py-4 text-lg" disabled={enviando}>
              Entrar
            </button>
          </form>
        )}

        {!buscando && sala && !yo && sala.estado !== 'lobby' && (
          <p className="mt-10 text-center text-lg text-white/80">Esta partida ya empezó. La siguiente te deja entrar.</p>
        )}

        {yo && sala?.estado === 'lobby' && (
          <div className="mt-16 text-center">
            <p className="font-display text-4xl font-bold">{yo.nombre}</p>
            <p className="mt-4 text-xl text-white/75">Ya estás dentro. Esperando a que inicie.</p>
            <button type="button" className="btn-secondary mt-8" onClick={salir}>
              Salir
            </button>
          </div>
        )}

        {yo && (sala?.estado === 'pregunta' || sala?.estado === 'revelada') && pregunta && (
          <div className="mt-6">
            <Cuenta segundos={sala.estado === 'pregunta' ? segundos : 0} />
            <p className="mt-4 font-display text-2xl font-bold leading-snug">{pregunta.texto}</p>
            {mia && sala.estado === 'pregunta' && (
              <p className="mt-3 text-sm font-bold text-lime">Respuesta enviada</p>
            )}
            <Opciones
              pregunta={pregunta}
              elegida={sala.estado === 'revelada' ? correcta : null}
              mia={mia?.opcion}
              onElegir={sala.estado === 'pregunta' && !mia ? elegir : null}
            />
          </div>
        )}

        {yo && sala?.estado === 'fin' && (
          <div className="mt-8">
            <p className="text-center font-display text-4xl font-bold text-lime">
              {gente.find((p) => p.id === yo.id)?.puntaje ?? 0} / {sala.mazo.length}
            </p>
            <Podio gente={gente} />
          </div>
        )}

        {!sala && !buscando && cargada && !aviso && (
          <p className="mt-10 text-center text-lg text-white/70">El anfitrión todavía no abre la sala.</p>
        )}
      </div>
    </div>
  )
}

function Podio({ gente }) {
  if (gente.length === 0) return <p className="mt-4 text-white/70">Nadie jugó esta vez.</p>
  return (
    <ol className="mt-4 space-y-2">
      {gente.map((persona, i) => (
        <li key={persona.id} className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
          <span>
            <span className="mr-3 text-white/40">{i + 1}</span>
            {persona.nombre}
          </span>
          <span className="font-bold text-lime">{persona.puntaje}/5</span>
        </li>
      ))}
    </ol>
  )
}

function Cuenta({ segundos }) {
  const ratio = Math.max(0, Math.min(1, segundos / SEGUNDOS_PREGUNTA))
  const urgente = segundos <= 5
  const tono = urgente ? 'text-red-300 border-red-400' : segundos <= 10 ? 'text-amber-200 border-amber-300' : 'text-white border-lime'
  const barra = urgente ? 'bg-red-400' : segundos <= 10 ? 'bg-amber-300' : 'bg-lime'
  return (
    <div className="mt-4 flex items-center gap-4">
      <div className={`grid h-16 w-16 shrink-0 place-items-center rounded-full border-4 font-display text-3xl font-bold tabular-nums ${tono}`}>
        {segundos}
      </div>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10" aria-hidden>
        <div className={`h-full ${barra}`} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  )
}

function Opciones({ pregunta, elegida, mia = null, onElegir = null }) {
  const cerrada = elegida !== null || !onElegir
  return (
    <ul className="mt-5 grid gap-3 sm:grid-cols-2">
      {pregunta.opciones.map((opcion, i) => {
        const buena = elegida !== null && i === elegida
        const marcada = mia === i && !buena
        let clase = `${COLORES_RETO[i]} text-white`
        if (buena) clase = 'bg-lime text-[#121212]'
        else if (marcada) clase = 'bg-white/10 text-white/50'
        else if (elegida !== null) clase = 'bg-white/5 text-white/40'
        return (
          <li key={opcion}>
            <button
              type="button"
              disabled={cerrada}
              onClick={() => onElegir?.(i)}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left text-lg font-bold disabled:cursor-default ${clase}`}
            >
              <span aria-hidden>{FORMAS_RETO[i]}</span>
              {opcion}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function CodigoQr({ valor }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let vigente = true
    import('qrcode').then((modulo) => {
      const qr = modulo.default ?? modulo
      qr.toDataURL(valor, {
        margin: 1,
        width: 280,
        color: { dark: '#121212', light: '#ffffff' },
      }).then((url) => {
        if (vigente) setSrc(url)
      })
    })
    return () => {
      vigente = false
    }
  }, [valor])
  if (!src) return <div className="mt-3 h-44 w-44 rounded-xl bg-neutral-100" />
  return <img src={src} alt="Código para entrar a la sala" className="mt-3 h-44 w-44 rounded-xl" />
}

function AvisoSql() {
  return (
    <p className="mt-4 rounded-2xl bg-amber-300/10 px-4 py-3 text-sm leading-relaxed text-amber-100">
      En Supabase, SQL Editor, corre el archivo supabase/migrations/005_ali_reto_sala.sql. Con eso se abre la sala.
    </p>
  )
}
