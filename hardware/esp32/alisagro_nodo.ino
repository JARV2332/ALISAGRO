/**
 * ALISAGRO — Nodo IoT ESP32
 * Sensores: DS18B20 (temp. suelo), YL-69 (humedad suelo), DHT11 (ambiente)
 * Envío HTTP POST cada 10 s → Supabase REST /rest/v1/ali_lecturas_monitoreo
 *
 * Librerías (Arduino Library Manager):
 *   - OneWire
 *   - DallasTemperature
 *   - DHT sensor library (Adafruit)
 *   - ArduinoJson (v6+)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ─── WiFi ───────────────────────────────────────────────────────────────────
const char* WIFI_SSID     = "TU_RED_WIFI";
const char* WIFI_PASSWORD = "TU_CLAVE_WIFI";

// ─── Supabase REST ──────────────────────────────────────────────────────────
const char* SUPABASE_URL = "https://lhbalfmlctawmfbpccfo.supabase.co";
const char* SUPABASE_ANON_KEY = "sb_publishable_SxcIq1Z0bZg9NX3yr4DDtg_tlSPXPk5";
const char* TABLA_REST = "/rest/v1/ali_lecturas_monitoreo";
const char* DEVICE_ID = "nodo-esp32-01";

// ─── Pines ──────────────────────────────────────────────────────────────────
#define PIN_ONEWIRE_DS18B20  4
#define PIN_YL69_ADC         34
#define PIN_DHT11            5
#define DHT_TYPE             DHT11

// Calibración YL-69 (ajustar en campo: valor ADC en seco vs. mojado)
#define YL69_ADC_SECO        3200
#define YL69_ADC_MOJADO      1200

// ─── Objetos sensores ───────────────────────────────────────────────────────
OneWire oneWire(PIN_ONEWIRE_DS18B20);
DallasTemperature sensoresSuelo(&oneWire);
DHT dhtAmbiente(PIN_DHT11, DHT_TYPE);

unsigned long ultimoEnvioMs = 0;
const unsigned long INTERVALO_ENVIO_MS = 10000;

bool wifiConectado = false;

void conectarWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    wifiConectado = true;
    return;
  }

  Serial.println("[WiFi] Conectando...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 30) {
    delay(500);
    Serial.print(".");
    intentos++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    wifiConectado = true;
    Serial.print("[WiFi] IP: ");
    Serial.println(WiFi.localIP());
  } else {
    wifiConectado = false;
    Serial.println("[WiFi] Error de conexión");
  }
}

float leerTemperaturaSueloC() {
  sensoresSuelo.requestTemperatures();
  float t = sensoresSuelo.getTempCByIndex(0);
  if (t == DEVICE_DISCONNECTED_C || t < -55.0f || t > 125.0f) {
    Serial.println("[DS18B20] Lectura inválida, usando simulación 22.4°C");
    return 22.4f;
  }
  return t;
}

float leerHumedadSueloPorcentaje() {
  int adc = analogRead(PIN_YL69_ADC);
  if (adc <= 0 || adc >= 4095) {
    Serial.println("[YL-69] ADC fuera de rango, simulación 48%");
    return 48.0f;
  }
  float pct = (float)(YL69_ADC_SECO - adc) * 100.0f / (float)(YL69_ADC_SECO - YL69_ADC_MOJADO);
  if (pct < 0.0f) pct = 0.0f;
  if (pct > 100.0f) pct = 100.0f;
  return pct;
}

void leerAmbiente(float& tempC, float& humPct) {
  tempC = dhtAmbiente.readTemperature();
  humPct = dhtAmbiente.readHumidity();

  if (isnan(tempC) || isnan(humPct)) {
    Serial.println("[DHT11] Lectura inválida, simulación 26.1°C / 61%");
    tempC = 26.1f;
    humPct = 61.0f;
  }
}

bool enviarLecturaSupabase(
  float tempSuelo,
  float humSuelo,
  float tempAmb,
  float humAmb
) {
  if (!wifiConectado) {
    conectarWiFi();
    if (!wifiConectado) return false;
  }

  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["temp_suelo"] = roundf(tempSuelo * 10.0f) / 10.0f;
  doc["humedad_suelo"] = roundf(humSuelo * 10.0f) / 10.0f;
  doc["temp_ambiente"] = roundf(tempAmb * 10.0f) / 10.0f;
  doc["humedad_ambiente"] = roundf(humAmb * 10.0f) / 10.0f;
  doc["metodo_captura"] = "IOT";

  String cuerpoJson;
  serializeJson(doc, cuerpoJson);

  String url = String(SUPABASE_URL) + String(TABLA_REST);

  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
  http.addHeader("Prefer", "return=minimal");

  int codigo = http.POST(cuerpoJson);
  String respuesta = http.getString();
  http.end();

  Serial.print("[HTTP] POST código: ");
  Serial.println(codigo);
  if (codigo < 200 || codigo >= 300) {
    Serial.println(respuesta);
    return false;
  }
  Serial.println("[HTTP] Lectura enviada correctamente");
  return true;
}

void setup() {
  Serial.begin(115200);
  delay(300);

  pinMode(PIN_YL69_ADC, INPUT);
  analogSetAttenuation(ADC_11db);

  sensoresSuelo.begin();
  dhtAmbiente.begin();

  conectarWiFi();

  Serial.println("=================================");
  Serial.println(" ALISAGRO Nodo ESP32 — Iniciado");
  Serial.println("=================================");
}

void loop() {
  unsigned long ahora = millis();

  if (WiFi.status() != WL_CONNECTED) {
    wifiConectado = false;
    conectarWiFi();
  }

  if (ahora - ultimoEnvioMs >= INTERVALO_ENVIO_MS) {
    ultimoEnvioMs = ahora;

    float tempSuelo = leerTemperaturaSueloC();
    float humSuelo = leerHumedadSueloPorcentaje();
    float tempAmb = 0.0f;
    float humAmb = 0.0f;
    leerAmbiente(tempAmb, humAmb);

    Serial.println("--- Lectura sensores ---");
    Serial.printf("  Temp. suelo:    %.1f °C\n", tempSuelo);
    Serial.printf("  Hum. suelo:    %.1f %%\n", humSuelo);
    Serial.printf("  Temp. ambiente: %.1f °C\n", tempAmb);
    Serial.printf("  Hum. ambiente:  %.1f %%\n", humAmb);

    enviarLecturaSupabase(tempSuelo, humSuelo, tempAmb, humAmb);
  }

  delay(200);
}
