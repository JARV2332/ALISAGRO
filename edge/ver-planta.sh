#!/bin/bash
cd /home/jarv/alisagro-edge || exit 1
export ALISAGRO_FOTO_BUCKET="${ALISAGRO_FOTO_BUCKET:-alisagro-fotos-677123926791}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"

pkill -f "src/analyze_plant.py" >/dev/null 2>&1 || true
pkill -f "input_format mjpeg" >/dev/null 2>&1 || true
sleep 0.4

nohup ./venv/bin/python src/analyze_plant.py --web >>/tmp/alisagro-vision.log 2>&1 &
echo $! >/tmp/alisagro-vision.pid

lista=0
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do
  if curl -sf -m 1 http://127.0.0.1:8765/datos 2>/dev/null | grep -q '"lista": true'; then
    lista=1
    break
  fi
  sleep 0.25
done

if [ "$lista" != "1" ]; then
  echo "No pude abrir la cámara." >&2
  tail -n 20 /tmp/alisagro-vision.log >&2
  exit 1
fi

if [ "${1:-}" = "--solo-servidor" ]; then
  exit 0
fi

url="http://127.0.0.1:8765"
if command -v chromium >/dev/null 2>&1; then
  chromium --app="$url" --window-size=1180,740 --new-window >/dev/null 2>&1 &
elif command -v chromium-browser >/dev/null 2>&1; then
  chromium-browser --app="$url" --window-size=1180,740 --new-window >/dev/null 2>&1 &
else
  xdg-open "$url" >/dev/null 2>&1 || echo "Abre $url en el navegador"
fi
