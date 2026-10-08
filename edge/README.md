# Visión en la Raspberry Pi

Webcam USB. No usa el conector de cámara de la placa.

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python src/analyze_plant.py
```

Una foto guardada, sin cámara:

```bash
python src/analyze_plant.py --image planta.jpg --once
```

El resultado es la proporción de verde, amarillo y tono seco. No diagnostica enfermedades ni deficiencias.
