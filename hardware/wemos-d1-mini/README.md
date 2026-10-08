# Wemos D1 Mini

1. Copia `secrets.h.example` a `secrets.h`.
2. Con `AWS_ENABLED` en 0 el programa solo imprime el JSON. No necesita AWS.
3. Cuando exista el certificado, `infra/scripts/provision-thing.ps1` reescribe `secrets.h` con `AWS_ENABLED` en 1.
4. Arduino IDE: placa LOLIN(WEMOS) D1 R2 & mini, librerías ArduinoJson 6 y DHT sensor library.
5. Monitor serie 115200. Escribe `s` para enviar ya. El botón va entre D6 y GND.
6. Calibra `SOIL_ADC_DRY` y `SOIL_ADC_WET` en el `.ino` con el sensor al aire y en agua.

`secrets.h` y `certs/` no se suben a Git.
