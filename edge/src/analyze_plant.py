"""Vista en vivo de la webcam USB para la Raspberry Pi 5.

Cuenta verde, amarillo y tono seco en la imagen.
No diagnostica enfermedades ni deficiencias nutricionales.
"""

from __future__ import annotations

import argparse
import json
import os
import signal
import subprocess
import sys
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import cv2
import numpy as np

PUERTO = 8765
ANCHO_CAMARA = 640
ALTO_CAMARA = 480


VACIO = {
    "detectada": False,
    "cobertura": 0.0,
    "verde": 0.0,
    "amarillo": 0.0,
    "seco": 0.0,
    "x": 0.0,
    "y": 0.0,
    "w": 0.0,
    "h": 0.0,
}


def _contar(mascara: np.ndarray, zona: np.ndarray) -> int:
    return int(cv2.countNonZero(cv2.bitwise_and(mascara, zona)))


def detectar_planta(frame: np.ndarray) -> dict:
    """Localiza el follaje y mide los colores solo dentro de esa zona.

    Ignora la piel, así que quien sostiene la maceta no entra al análisis.
    No identifica la especie ni diagnostica una enfermedad.
    """
    chico = cv2.resize(frame, (320, 180), interpolation=cv2.INTER_AREA)
    alto, ancho = chico.shape[:2]
    total = alto * ancho
    hsv = cv2.cvtColor(chico, cv2.COLOR_BGR2HSV)
    ycrcb = cv2.cvtColor(chico, cv2.COLOR_BGR2YCrCb)
    no_piel = cv2.bitwise_not(cv2.inRange(ycrcb, (0, 133, 77), (255, 173, 127)))

    verde = cv2.bitwise_and(cv2.inRange(hsv, (35, 40, 35), (92, 255, 255)), no_piel)
    amarillo = cv2.bitwise_and(cv2.inRange(hsv, (16, 45, 45), (34, 255, 255)), no_piel)
    seco = cv2.bitwise_and(cv2.inRange(hsv, (6, 45, 30), (18, 200, 170)), no_piel)

    vivo = cv2.bitwise_or(verde, amarillo)
    nucleo = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    vivo = cv2.morphologyEx(vivo, cv2.MORPH_OPEN, nucleo)
    puente = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    unido = cv2.dilate(vivo, puente, iterations=2)

    cantidad, etiquetas, stats, _ = cv2.connectedComponentsWithStats(
        (unido > 0).astype(np.uint8), connectivity=8
    )
    mejor = 0
    mejor_area = 0
    for indice in range(1, cantidad):
        area = int(stats[indice, cv2.CC_STAT_AREA])
        if area >= total * 0.008 and area > mejor_area:
            mejor = indice
            mejor_area = area
    if mejor == 0:
        return dict(VACIO)

    zona = np.where(etiquetas == mejor, 255, 0).astype(np.uint8)
    if mejor_area > total * 0.18:
        bordes = cv2.Canny(cv2.cvtColor(chico, cv2.COLOR_BGR2GRAY), 80, 160)
        if _contar(bordes, zona) / mejor_area < 0.02:
            return dict(VACIO)

    verdes = _contar(verde, zona)
    amarillos = _contar(amarillo, zona)
    secos = _contar(seco, zona)
    if verdes + amarillos < total * 0.004:
        return dict(VACIO)

    planta = verdes + amarillos + secos
    x = int(stats[mejor, cv2.CC_STAT_LEFT])
    y = int(stats[mejor, cv2.CC_STAT_TOP])
    w = int(stats[mejor, cv2.CC_STAT_WIDTH])
    h = int(stats[mejor, cv2.CC_STAT_HEIGHT])
    margen_x = max(2, int(w * 0.06))
    margen_y = max(2, int(h * 0.06))
    x0 = max(0, x - margen_x)
    y0 = max(0, y - margen_y)
    x1 = min(ancho, x + w + margen_x)
    y1 = min(alto, y + h + margen_y)
    return {
        "detectada": True,
        "cobertura": 100.0 * planta / total,
        "verde": 100.0 * verdes / planta,
        "amarillo": 100.0 * amarillos / planta,
        "seco": 100.0 * secos / planta,
        "x": x0 / ancho,
        "y": y0 / alto,
        "w": (x1 - x0) / ancho,
        "h": (y1 - y0) / alto,
    }


def _suavizar_caja(
    previa: tuple[float, float, float, float] | None,
    nueva: tuple[float, float, float, float],
) -> tuple[float, float, float, float]:
    if previa is None:
        return nueva
    return tuple(anterior * 0.4 + actual * 0.6 for anterior, actual in zip(previa, nueva))


class Lectura:
    def __init__(self) -> None:
        self.historial: list[dict] = []
        self.perdidas = 0
        self.caja: tuple[float, float, float, float] | None = None
        self.resultado = dict(VACIO)

    def actualizar(self, frame: np.ndarray) -> dict:
        nuevo = detectar_planta(frame)
        if nuevo["detectada"]:
            self.perdidas = 0
            colores = promediar(
                self.historial,
                {clave: nuevo[clave] for clave in ("cobertura", "verde", "amarillo", "seco")},
            )
            self.caja = _suavizar_caja(
                self.caja, (nuevo["x"], nuevo["y"], nuevo["w"], nuevo["h"])
            )
            x, y, ancho, alto = self.caja
            self.resultado = {
                **colores,
                "detectada": True,
                "x": x,
                "y": y,
                "w": ancho,
                "h": alto,
            }
        else:
            self.perdidas += 1
            if self.perdidas >= 4:
                self.historial.clear()
                self.caja = None
                self.resultado = dict(VACIO)
        return self.resultado


def describir(resultado: dict) -> str:
    if not resultado.get("detectada"):
        return (
            "No veo una planta.\n"
            "Acerca una maceta o apunta a la parcela.\n"
            "Esto no dice el nombre de la planta ni diagnostica una enfermedad."
        )
    return (
        "Planta detectada. El análisis es solo de la zona marcada.\n"
        "No dice el nombre ni diagnostica una enfermedad.\n"
        f"Cobertura vegetal: {resultado['cobertura']:.0f}%\n"
        f"Verde: {resultado['verde']:.0f}%\n"
        f"Amarillo: {resultado['amarillo']:.0f}%\n"
        f"Seco visual: {resultado['seco']:.0f}%"
    )


def abrir_camara(indice: int):
    backend = cv2.CAP_DSHOW if sys.platform == "win32" else cv2.CAP_V4L2
    camara = cv2.VideoCapture(indice, backend)
    if not camara.isOpened():
        camara.release()
        camara = cv2.VideoCapture(indice)
    return camara


def configurar_camara(camara) -> None:
    camara.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    camara.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*"MJPG"))
    camara.set(cv2.CAP_PROP_FRAME_WIDTH, ANCHO_CAMARA)
    camara.set(cv2.CAP_PROP_FRAME_HEIGHT, ALTO_CAMARA)
    camara.set(cv2.CAP_PROP_FPS, 30)


def aligerar(frame: np.ndarray) -> np.ndarray:
    alto, ancho = frame.shape[:2]
    if ancho <= ANCHO_CAMARA:
        return frame
    nuevo_alto = max(1, int(alto * ANCHO_CAMARA / ancho))
    return cv2.resize(frame, (ANCHO_CAMARA, nuevo_alto), interpolation=cv2.INTER_AREA)


def promediar(historial: list[dict], nuevo: dict) -> dict:
    historial.append(nuevo)
    del historial[:-4]
    return {
        clave: sum(item[clave] for item in historial) / len(historial)
        for clave in nuevo
    }


class EnVivo:
    def __init__(self) -> None:
        self.condicion = threading.Condition()
        self.lock = threading.Lock()
        self.jpeg: bytes | None = None
        self.seq = 0
        self.datos = {
            "cobertura": 0.0,
            "verde": 0.0,
            "amarillo": 0.0,
            "seco": 0.0,
            "fps": 0.0,
            "lista": False,
            "error": "",
        }
        self.clientes = 0
        self.proceso: subprocess.Popen | None = None


en_vivo = EnVivo()
detener = threading.Event()
BUCKET_FOTO = os.environ.get("ALISAGRO_FOTO_BUCKET", "").strip()
CADA_FOTO = max(15, int(os.environ.get("ALISAGRO_FOTO_CADA", "60") or "60"))
envio_estado = {"texto": ""}


def cargar_bucket() -> None:
    global BUCKET_FOTO
    if BUCKET_FOTO:
        return
    ruta = os.path.join(os.path.dirname(__file__), "..", ".env")
    try:
        with open(ruta, encoding="utf-8") as archivo:
            for linea in archivo:
                linea = linea.strip()
                if linea.startswith("ALISAGRO_FOTO_BUCKET="):
                    BUCKET_FOTO = linea.split("=", 1)[1].strip().strip('"').strip("'")
    except OSError:
        return


def enviar_jpeg(jpg: bytes, datos: dict) -> str:
    cargar_bucket()
    if not BUCKET_FOTO:
        return "Falta configurar el bucket de fotos."
    try:
        import boto3
    except ImportError:
        return "Falta boto3 en la Pi."
    marca = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
    clave = f"fotos/alisagro-pi/{marca}-{uuid.uuid4().hex[:8]}.jpg"

    def texto(clave_dato: str) -> str:
        try:
            return f"{float(datos.get(clave_dato) or 0):.1f}"
        except (TypeError, ValueError):
            return "0.0"

    boto3.client("s3", region_name=os.environ.get("AWS_DEFAULT_REGION", "us-east-1")).put_object(
        Bucket=BUCKET_FOTO,
        Key=clave,
        Body=jpg,
        ContentType="image/jpeg",
        Metadata={
            "device": "alisagro-pi",
            "cobertura": texto("cobertura"),
            "verde": texto("verde"),
            "amarillo": texto("amarillo"),
            "seco": texto("seco"),
        },
    )
    return "Foto enviada a AWS."


def enviar_actual() -> str:
    with en_vivo.lock:
        jpg = en_vivo.jpeg
        datos = dict(en_vivo.datos)
    if not jpg:
        texto_estado = "Todavía no hay imagen."
    else:
        try:
            texto_estado = enviar_jpeg(jpg, datos)
        except Exception as error:
            texto_estado = f"No se pudo enviar ({error.__class__.__name__})."
    envio_estado["texto"] = texto_estado
    with en_vivo.lock:
        en_vivo.datos["envio"] = texto_estado
    return texto_estado


def bucle_envio() -> None:
    if detener.wait(12):
        return
    enviar_actual()
    while not detener.wait(CADA_FOTO):
        enviar_actual()


def fijar_ritmo(indice: int) -> None:
    if sys.platform == "win32":
        return
    subprocess.run(
        ["v4l2-ctl", "-d", f"/dev/video{indice}", "-c", "exposure_dynamic_framerate=0"],
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def cerrar_flujo() -> None:
    proceso = en_vivo.proceso
    if proceso is None or proceso.poll() is not None:
        return
    proceso.terminate()
    try:
        proceso.wait(timeout=1)
    except subprocess.TimeoutExpired:
        proceso.kill()


def publicar(jpg: bytes, resultado: dict, fps: float) -> None:
    with en_vivo.lock:
        en_vivo.jpeg = jpg
        en_vivo.seq += 1
        en_vivo.datos = {
            **resultado,
            "fps": round(fps, 1),
            "lista": True,
            "error": "",
            "envio": envio_estado["texto"],
        }
    with en_vivo.condicion:
        en_vivo.condicion.notify_all()


def abrir_ffmpeg(indice: int) -> subprocess.Popen | None:
    if sys.platform == "win32":
        return None
    fijar_ritmo(indice)
    try:
        proceso = subprocess.Popen(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-fflags",
                "nobuffer",
                "-flags",
                "low_delay",
                "-probesize",
                "32",
                "-analyzeduration",
                "0",
                "-f",
                "v4l2",
                "-input_format",
                "mjpeg",
                "-framerate",
                "30",
                "-video_size",
                "1280x720",
                "-i",
                f"/dev/video{indice}",
                "-c:v",
                "copy",
                "-f",
                "mjpeg",
                "pipe:1",
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            bufsize=0,
        )
    except FileNotFoundError:
        return None
    en_vivo.proceso = proceso
    time.sleep(0.2)
    fijar_ritmo(indice)
    return proceso


def bucle_ffmpeg(proceso: subprocess.Popen) -> bool:
    assert proceso.stdout is not None
    buf = b""
    lectura = Lectura()
    resultado = dict(VACIO)
    ultimo_analisis = 0.0
    frames = 0
    marca = time.perf_counter()
    fps = 0.0
    vio_cuadro = False
    try:
        while not detener.is_set():
            chunk = proceso.stdout.read(32768)
            if not chunk:
                break
            buf += chunk
            if len(buf) > 2_000_000:
                buf = buf[-200_000:]
            while True:
                inicio = buf.find(b"\xff\xd8")
                if inicio < 0:
                    buf = b""
                    break
                fin = buf.find(b"\xff\xd9", inicio + 2)
                if fin < 0:
                    buf = buf[inicio:]
                    break
                jpg = buf[inicio : fin + 2]
                buf = buf[fin + 2 :]
                vio_cuadro = True
                ahora = time.perf_counter()
                if ahora - ultimo_analisis >= 0.25:
                    imagen = cv2.imdecode(np.frombuffer(jpg, dtype=np.uint8), cv2.IMREAD_COLOR)
                    if imagen is not None:
                        resultado = lectura.actualizar(imagen)
                    ultimo_analisis = ahora
                frames += 1
                if ahora - marca >= 1:
                    fps = frames / (ahora - marca)
                    frames = 0
                    marca = ahora
                publicar(jpg, resultado, fps)
    finally:
        cerrar_flujo()
    return vio_cuadro


def bucle_camara(indice: int) -> None:
    proceso = abrir_ffmpeg(indice)
    if proceso is not None and bucle_ffmpeg(proceso):
        return
    if proceso is not None:
        cerrar_flujo()
        time.sleep(0.3)

    camara = abrir_camara(indice)
    if not camara.isOpened():
        with en_vivo.lock:
            en_vivo.datos["error"] = "No detecté la webcam USB."
        print("No detecté la webcam USB.", file=sys.stderr)
        return

    configurar_camara(camara)
    fijar_ritmo(indice)
    for _ in range(3):
        camara.read()

    lectura = Lectura()
    resultado = dict(VACIO)
    ultimo_analisis = 0.0
    frames = 0
    marca = time.perf_counter()
    fps = 0.0

    while not detener.is_set():
        ok, frame = camara.read()
        if not ok:
            with en_vivo.lock:
                en_vivo.datos["error"] = "La webcam no entregó imagen."
            time.sleep(0.05)
            continue

        frame = aligerar(frame)
        ahora = time.perf_counter()
        if ahora - ultimo_analisis >= 0.2:
            resultado = lectura.actualizar(frame)
            ultimo_analisis = ahora

        frames += 1
        if ahora - marca >= 1:
            fps = frames / (ahora - marca)
            frames = 0
            marca = ahora

        ok_jpg, buf = cv2.imencode(
            ".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70]
        )
        if not ok_jpg:
            continue

        with en_vivo.lock:
            en_vivo.jpeg = buf.tobytes()
            en_vivo.seq += 1
            en_vivo.datos = {
                **resultado,
                "fps": round(fps, 1),
                "lista": True,
                "error": "",
                "envio": envio_estado["texto"],
            }
        with en_vivo.condicion:
            en_vivo.condicion.notify_all()

    camara.release()


HTML = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ALISAGRO · Vista de la planta</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    background: #e5efe4;
    color: #111;
    font-family: "Segoe UI", system-ui, sans-serif;
    padding: 22px;
  }
  .marco {
    width: min(1180px, 100%);
    margin: 0 auto;
    display: grid;
    grid-template-columns: minmax(0, 1.7fr) minmax(260px, 0.75fr);
    gap: 18px;
    align-items: start;
  }
  .video {
    background: #17241b;
    border-radius: 18px;
    overflow: hidden;
    aspect-ratio: 16 / 9;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 12px 28px rgba(23, 36, 27, 0.16);
    position: relative;
  }
  #caja {
    position: absolute;
    border: 3px solid #111;
    border-radius: 12px;
    box-shadow: 0 0 0 2px #e7f56a;
    pointer-events: none;
  }
  #caja span {
    position: absolute;
    left: 8px;
    top: 8px;
    background: #fffaf3;
    color: #111;
    border: 1px solid #111;
    border-radius: 999px;
    padding: 3px 8px;
    font-size: 13px;
    font-weight: 700;
  }
  .punto.espera { background: #c4a15a; }
  .video img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    background: #17241b;
  }
  .panel {
    background: #fffaf3;
    color: #111;
    border-radius: 18px;
    padding: 22px 22px 16px;
    box-shadow: 0 12px 28px rgba(23, 36, 27, 0.08);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .marca {
    margin: 0;
    font-size: 13px;
    letter-spacing: 0.16em;
    font-weight: 700;
    color: #111;
  }
  h1 { margin: 4px 0 0; font-size: 28px; font-weight: 700; color: #111; }
  .vivo { display: flex; align-items: center; gap: 8px; font-weight: 700; color: #111; }
  .punto { width: 9px; height: 9px; border-radius: 50%; background: #1f7a3a; }
  .metrica { display: flex; flex-direction: column; gap: 6px; }
  .fila { display: flex; justify-content: space-between; align-items: baseline; color: #111; }
    .fila span { font-size: 14px; font-weight: 600; }
  .fila strong { font-size: 28px; font-weight: 700; letter-spacing: -0.03em; }
  .pista { height: 9px; background: #e6e1d8; border-radius: 99px; overflow: hidden; }
  .lleno { height: 100%; width: 0; border-radius: 99px; }
  .verde { background: #1f7a3a; }
  .amarillo { background: #d4a017; }
  .seco { background: #8a5a3b; }
  .cobertura { background: #3d5c45; }
  .nota { margin: 0; color: #111; font-size: 13px; line-height: 1.45; }
  .pie { margin-top: auto; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  button {
    font: inherit; color: #111; background: #fff; border: 1px solid #111;
    border-radius: 999px; padding: 8px 14px; cursor: pointer;
  }
  #ritmo { font-size: 13px; font-weight: 700; color: #111; }
  .marco:fullscreen { width: 100%; height: 100%; background: #e5efe4; padding: 16px; align-items: center; }
  .marco:fullscreen .video { width: min(100%, calc((100vh - 48px) * 16 / 9)); }
  @media (max-width: 860px) { .marco { grid-template-columns: 1fr; } }
</style>
</head>
<body>
  <div class="marco" id="marco">
    <div class="video">
      <img src="/video" alt="Imagen en vivo de la webcam">
      <div id="caja" hidden><span>Planta</span></div>
    </div>
    <aside class="panel">
      <div>
        <p class="marca">ALISAGRO</p>
        <h1>Vista de la planta</h1>
      </div>
      <div class="vivo"><span class="punto espera" id="punto"></span><span id="estado">Conectando…</span></div>
      <div class="metrica">
        <div class="fila"><span>Cobertura</span><strong id="cobertura">–</strong></div>
        <div class="pista"><div class="lleno cobertura" id="cobertura-barra"></div></div>
      </div>
      <div class="metrica">
        <div class="fila"><span>Verde</span><strong id="verde">–</strong></div>
        <div class="pista"><div class="lleno verde" id="verde-barra"></div></div>
      </div>
      <div class="metrica">
        <div class="fila"><span>Amarillo</span><strong id="amarillo">–</strong></div>
        <div class="pista"><div class="lleno amarillo" id="amarillo-barra"></div></div>
      </div>
      <div class="metrica">
        <div class="fila"><span>Seco visual</span><strong id="seco">–</strong></div>
        <div class="pista"><div class="lleno seco" id="seco-barra"></div></div>
      </div>
      <p class="nota">Primero marca la planta, en la parcela o en la maceta, y mide solo esa zona. No dice el nombre ni diagnostica una enfermedad.</p>
      <p class="nota" id="envio"></p>
      <div class="pie">
        <span id="ritmo"></span>
        <span>
          <button type="button" id="enviar">Enviar foto a AWS</button>
          <button type="button" id="completa">Pantalla completa</button>
        </span>
      </div>
    </aside>
  </div>
<script>
function poner(id, valor) {
  const n = Math.max(0, Math.min(100, Math.round(valor)));
  document.getElementById(id).textContent = n + "%";
  document.getElementById(id + "-barra").style.width = n + "%";
}
function limpiar() {
  ["cobertura", "verde", "amarillo", "seco"].forEach((id) => {
    document.getElementById(id).textContent = "–";
    document.getElementById(id + "-barra").style.width = "0";
  });
}
async function tick() {
  try {
    const respuesta = await fetch("/datos", { cache: "no-store" });
    const datos = await respuesta.json();
    const estado = document.getElementById("estado");
    const punto = document.getElementById("punto");
    const caja = document.getElementById("caja");
    if (!datos.lista) {
      estado.textContent = datos.error || "Conectando…";
      return;
    }
    document.getElementById("ritmo").textContent = datos.fps > 0 ? Math.round(datos.fps) + " img/s" : "";
    if (!datos.detectada) {
      estado.textContent = "Buscando una planta";
      punto.className = "punto espera";
      caja.hidden = true;
      limpiar();
      return;
    }
    estado.textContent = "Planta detectada";
    punto.className = "punto";
    caja.hidden = false;
    caja.style.left = (datos.x * 100) + "%";
    caja.style.top = (datos.y * 100) + "%";
    caja.style.width = (datos.w * 100) + "%";
    caja.style.height = (datos.h * 100) + "%";
    poner("cobertura", datos.cobertura);
    poner("verde", datos.verde);
    poner("amarillo", datos.amarillo);
    poner("seco", datos.seco);
    if (datos.envio) document.getElementById("envio").textContent = datos.envio;
  } catch (e) {
    document.getElementById("estado").textContent = "Sin conexión";
  }
}
document.getElementById("enviar").onclick = async () => {
  const nodo = document.getElementById("envio");
  nodo.textContent = "Enviando la foto…";
  try {
    const respuesta = await fetch("/enviar", { method: "POST" });
    const datos = await respuesta.json();
    nodo.textContent = datos.mensaje || "Listo";
  } catch (e) {
    nodo.textContent = "No se pudo enviar";
  }
};
document.getElementById("completa").onclick = () => {
  const marco = document.getElementById("marco");
  if (document.fullscreenElement) document.exitFullscreen();
  else marco.requestFullscreen();
};
tick();
setInterval(tick, 200);
</script>
</body>
</html>
"""


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt: str, *args) -> None:
        return

    def _enviar(self, codigo: int, tipo: str, cuerpo: bytes) -> None:
        self.send_response(codigo)
        self.send_header("Content-Type", tipo)
        self.send_header("Content-Length", str(len(cuerpo)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(cuerpo)

    def do_GET(self) -> None:
        ruta = self.path.split("?", 1)[0]
        if ruta == "/":
            self._enviar(200, "text/html; charset=utf-8", HTML.encode("utf-8"))
            return
        if ruta == "/salud":
            self._enviar(200, "text/plain; charset=utf-8", b"ok")
            return
        if ruta == "/datos":
            with en_vivo.lock:
                datos = dict(en_vivo.datos)
            self._enviar(200, "application/json; charset=utf-8", json.dumps(datos).encode("utf-8"))
            return
        if ruta == "/foto":
            with en_vivo.lock:
                jpg = en_vivo.jpeg
            if jpg is None:
                self._enviar(503, "text/plain; charset=utf-8", b"sin imagen")
                return
            self._enviar(200, "image/jpeg", jpg)
            return
        if ruta == "/video":
            self._video()
            return
        self._enviar(404, "text/plain; charset=utf-8", b"no")

    def do_POST(self) -> None:
        ruta = self.path.split("?", 1)[0]
        largo = int(self.headers.get("Content-Length") or 0)
        if largo:
            self.rfile.read(largo)
        if ruta != "/enviar":
            self._enviar(404, "text/plain; charset=utf-8", b"no")
            return
        mensaje = enviar_actual()
        cuerpo = json.dumps({"mensaje": mensaje}).encode("utf-8")
        codigo = 200 if mensaje.startswith("Foto enviada") else 502
        self._enviar(codigo, "application/json; charset=utf-8", cuerpo)

    def _video(self) -> None:
        self.send_response(200)
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
        self.end_headers()
        with en_vivo.lock:
            en_vivo.clientes += 1
        ultimo = -1
        try:
            while not detener.is_set():
                with en_vivo.condicion:
                    en_vivo.condicion.wait(timeout=0.5)
                with en_vivo.lock:
                    seq = en_vivo.seq
                    jpg = en_vivo.jpeg
                if jpg is None or seq == ultimo:
                    continue
                ultimo = seq
                encabezado = (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n"
                    b"Content-Length: " + str(len(jpg)).encode("ascii") + b"\r\n\r\n"
                )
                self.wfile.write(encabezado)
                self.wfile.write(jpg)
                self.wfile.write(b"\r\n")
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, OSError):
            return
        finally:
            with en_vivo.lock:
                en_vivo.clientes = max(0, en_vivo.clientes - 1)


def vigilar(servidor: ThreadingHTTPServer, mantener: bool) -> None:
    if mantener:
        return
    inicio = time.time()
    tuvo_cliente = False
    vacio_desde: float | None = None
    while not detener.is_set():
        time.sleep(0.4)
        with en_vivo.lock:
            clientes = en_vivo.clientes
        if clientes > 0:
            tuvo_cliente = True
            vacio_desde = None
            continue
        if not tuvo_cliente:
            if time.time() - inicio > 60:
                tuvo_cliente = True
            continue
        if vacio_desde is None:
            vacio_desde = time.time()
        elif time.time() - vacio_desde > 8:
            detener.set()
            servidor.shutdown()
            return


class Servidor(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


def servir(indice: int, mantener: bool) -> int:
    hilo = threading.Thread(target=bucle_camara, args=(indice,), daemon=True)
    hilo.start()
    try:
        servidor = Servidor(("0.0.0.0", PUERTO), Handler)
    except OSError as error:
        print(f"No pude abrir el puerto {PUERTO}: {error}", file=sys.stderr)
        detener.set()
        return 1
    vigia = threading.Thread(target=vigilar, args=(servidor, mantener), daemon=True)
    vigia.start()
    print(f"Pantalla lista en http://127.0.0.1:{PUERTO}")
    cargar_bucket()
    if BUCKET_FOTO:
        threading.Thread(target=bucle_envio, daemon=True).start()

    def al_cerrar(signo, _frame) -> None:
        detener.set()
        cerrar_flujo()
        signal.signal(signo, signal.SIG_DFL)
        os.kill(os.getpid(), signo)

    signal.signal(signal.SIGTERM, al_cerrar)
    signal.signal(signal.SIGINT, al_cerrar)
    try:
        servidor.serve_forever(poll_interval=0.3)
    finally:
        detener.set()
        cerrar_flujo()
        servidor.server_close()
        hilo.join(timeout=2)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Vista en vivo de una planta con webcam USB")
    parser.add_argument("--camera", type=int, default=int(os.environ.get("CAMERA_INDEX", "0")))
    parser.add_argument("--image", help="Analiza un archivo en lugar de la webcam")
    parser.add_argument("--once", action="store_true", help="Una sola captura y termina")
    parser.add_argument("--no-window", action="store_true")
    parser.add_argument("--web", action="store_true", help="Abre la pantalla en el navegador")
    parser.add_argument("--mantener", action="store_true", help="No cierra el servidor al cerrar la página")
    parser.add_argument("--prueba", type=int, default=0, help="Lee N cuadros y mide la velocidad")
    args = parser.parse_args()

    if args.image:
        frame = cv2.imread(args.image)
        if frame is None:
            print(f"No pude abrir {args.image}", file=sys.stderr)
            return 1
        print(describir(detectar_planta(frame)))
        return 0

    if args.web:
        return servir(args.camera, args.mantener)

    camara = abrir_camara(args.camera)
    if not camara.isOpened():
        print("No detecté la webcam USB. Prueba --camera 1.", file=sys.stderr)
        return 1
    configurar_camara(camara)

    if args.prueba > 0:
        ancho = int(camara.get(cv2.CAP_PROP_FRAME_WIDTH))
        alto = int(camara.get(cv2.CAP_PROP_FRAME_HEIGHT))
        print(f"camara {ancho}x{alto}")
        inicio = time.perf_counter()
        leidos = 0
        for _ in range(args.prueba):
            ok, frame = camara.read()
            if not ok:
                break
            aligerar(frame)
            leidos += 1
        camara.release()
        elapsed = time.perf_counter() - inicio
        ritmo = leidos / elapsed if elapsed else 0
        print(f"{leidos} cuadros en {elapsed:.2f}s ({ritmo:.1f} img/s)")
        return 0 if leidos else 1

    if args.no_window or args.once:
        ok, frame = camara.read()
        camara.release()
        if not ok:
            print("La webcam no entregó imagen.", file=sys.stderr)
            return 1
        print(describir(detectar_planta(aligerar(frame))))
        return 0

    camara.release()
    return servir(args.camera, args.mantener)


if __name__ == "__main__":
    raise SystemExit(main())
