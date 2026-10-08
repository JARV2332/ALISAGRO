import assert from 'node:assert/strict'
import test from 'node:test'
import { mapReading } from './mapReading.mjs'

test('traduce el payload del Wemos', () => {
  const result = mapReading({
    deviceId: 'alisagro-01',
    temperature: 27.44,
    humidity: 61.2,
    soilMoisture: 48.7,
    timestamp: 'ignorado',
  })

  assert.equal(result.ok, true)
  assert.deepEqual(result.row, {
    device_id: 'alisagro-01',
    metodo_captura: 'IOT',
    temp_ambiente: 27.4,
    humedad_ambiente: 61.2,
    humedad_suelo: 48.7,
  })
})

test('acepta solo humedad de suelo', () => {
  const result = mapReading({ deviceId: 'alisagro-01', soilMoisture: 22 })
  assert.equal(result.ok, true)
  assert.equal(result.row.humedad_suelo, 22)
  assert.equal(result.row.temp_ambiente, undefined)
})

test('rechaza humedad imposible', () => {
  const result = mapReading({ deviceId: 'alisagro-01', humidity: 150 })
  assert.equal(result.ok, false)
})

test('rechaza un dispositivo vacío', () => {
  const result = mapReading({ temperature: 25 })
  assert.equal(result.ok, false)
})
