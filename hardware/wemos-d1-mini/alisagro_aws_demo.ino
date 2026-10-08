/**
 * ALISAGRO — Nodo demo AWS Community Day
 * Placa: Wemos D1 Mini (ESP8266)
 *
 * A0  humedad de suelo (única entrada analógica)
 * D2  DHT11
 * D6  botón a GND, envío inmediato. También puedes escribir "s" en el monitor serie.
 *
 * Cada 60 s publica JSON. No envía lecturas inventadas.
 * Copia secrets.h.example a secrets.h antes de compilar.
 *
 * Librerías: ArduinoJson 6, DHT sensor library (Adafruit),
 * PubSubClient (solo si AWS_ENABLED es 1).
 */

#include <ESP8266WiFi.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include "secrets.h"

#if AWS_ENABLED
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <time.h>
#include "amazon_root_ca1.h"

BearSSL::X509List trustAnchors(AWS_ROOT_CA);
BearSSL::X509List clientCert(CLIENT_CERT);
BearSSL::PrivateKey clientKey(CLIENT_KEY);
WiFiClientSecure net;
PubSubClient mqtt(net);
#endif

#define PIN_DHT D2
#define PIN_BUTTON D6
#define DHT_TYPE DHT11

#define SOIL_ADC_DRY 850
#define SOIL_ADC_WET 350

const unsigned long INTERVALO_MS = 60000;
const unsigned long MINIMO_ENTRE_ENVIOS_MS = 5000;
const unsigned long ESPERA_INICIAL_MS = 8000;

DHT dht(PIN_DHT, DHT_TYPE);
unsigned long ultimoEnvioMs = 0;

void conectarWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[wifi] Conectando");
  for (int i = 0; i < 30 && WiFi.status() != WL_CONNECTED; i++) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("[wifi] IP ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("[wifi] Sin conexión. El JSON se muestra por serie.");
  }
}

bool leerHumedadSuelo(float& porcentaje) {
  int adc = analogRead(A0);
  Serial.printf("[suelo] ADC %d\n", adc);
  if (adc <= 5 || adc >= 1020) {
    Serial.println("[suelo] Sensor no detectado");
    return false;
  }
  float valor = (float)(SOIL_ADC_DRY - adc) * 100.0f / (float)(SOIL_ADC_DRY - SOIL_ADC_WET);
  if (valor < 0.0f) valor = 0.0f;
  if (valor > 100.0f) valor = 100.0f;
  porcentaje = valor;
  return true;
}

bool armarPayload(String& salida) {
  StaticJsonDocument<192> doc;
  doc["deviceId"] = DEVICE_ID;
  int mediciones = 0;

  float suelo = 0.0f;
  if (leerHumedadSuelo(suelo)) {
    doc["soilMoisture"] = roundf(suelo * 10.0f) / 10.0f;
    mediciones++;
  }

  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  if (!isnan(temp) && temp > -10.0f && temp < 60.0f) {
    doc["temperature"] = roundf(temp * 10.0f) / 10.0f;
    mediciones++;
  } else {
    Serial.println("[dht] Temperatura no válida");
  }
  if (!isnan(hum) && hum >= 0.0f && hum <= 100.0f) {
    doc["humidity"] = roundf(hum * 10.0f) / 10.0f;
    mediciones++;
  } else {
    Serial.println("[dht] Humedad no válida");
  }

  if (mediciones == 0) return false;
  serializeJson(doc, salida);
  return true;
}

#if AWS_ENABLED
void sincronizarReloj() {
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  Serial.print("[reloj] ");
  time_t ahora = time(nullptr);
  for (int i = 0; i < 20 && ahora < 100000; i++) {
    delay(500);
    ahora = time(nullptr);
    Serial.print(".");
  }
  Serial.println();
  if (ahora < 100000) Serial.println("[reloj] Sin hora. TLS puede fallar.");
}

void conectarMqtt() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (mqtt.connected()) return;
  Serial.print("[aws] MQTT ");
  if (mqtt.connect(MQTT_CLIENT_ID)) {
    Serial.println("ok");
  } else {
    Serial.print("error ");
    Serial.println(mqtt.state());
  }
}

bool publicar(const String& cuerpo) {
  if (WiFi.status() != WL_CONNECTED) return false;
  if (!mqtt.connected()) conectarMqtt();
  if (!mqtt.connected()) return false;
  return mqtt.publish(MQTT_TOPIC, cuerpo.c_str(), false);
}
#endif

void enviarLectura() {
  String cuerpo;
  if (!armarPayload(cuerpo)) {
    Serial.println("[sensor] Nada válido para enviar");
    return;
  }
  Serial.println(cuerpo);
#if AWS_ENABLED
  if (publicar(cuerpo)) Serial.println("[aws] Publicado");
  else Serial.println("[aws] No publicado. El JSON quedó en el monitor serie.");
#endif
  ultimoEnvioMs = millis();
}

void setup() {
  Serial.begin(115200);
  delay(300);
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  dht.begin();
  conectarWiFi();

#if AWS_ENABLED
  net.setTrustAnchors(&trustAnchors);
  net.setClientRSACert(&clientCert, &clientKey);
  net.setBufferSizes(1024, 1024);
  mqtt.setServer(AWS_IOT_ENDPOINT, AWS_IOT_PORT);
  mqtt.setBufferSize(256);
  sincronizarReloj();
  conectarMqtt();
#endif

  Serial.println("ALISAGRO Wemos listo. 's' + Enter envía ahora.");
}

void loop() {
#if AWS_ENABLED
  if (WiFi.status() != WL_CONNECTED) conectarWiFi();
  if (!mqtt.connected()) conectarMqtt();
  mqtt.loop();
#endif

  bool manual = false;
  while (Serial.available()) {
    char c = Serial.read();
    if (c == 's' || c == 'S') manual = true;
  }
  if (digitalRead(PIN_BUTTON) == LOW) manual = true;

  unsigned long ahora = millis();
  bool tocaPeriodo = ultimoEnvioMs > 0 && (ahora - ultimoEnvioMs >= INTERVALO_MS);
  bool tocaInicio = ultimoEnvioMs == 0 && ahora >= ESPERA_INICIAL_MS;
  bool tocaManual = manual && ultimoEnvioMs > 0 && (ahora - ultimoEnvioMs >= MINIMO_ENTRE_ENVIOS_MS);

  if (tocaInicio || tocaPeriodo || tocaManual) enviarLectura();
  delay(50);
}
