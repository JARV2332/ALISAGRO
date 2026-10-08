import { spawnSync } from 'node:child_process'

const topic = 'alisagro/demo/alisagro-01/telemetry'
const region = 'us-east-1'

const args = process.argv.slice(2)
const flags = {}
for (let i = 0; i < args.length; i += 1) {
  const key = args[i]
  if (!key.startsWith('--')) continue
  const name = key.slice(2)
  if (name === 'dry-run') {
    flags[name] = true
    continue
  }
  flags[name] = args[i + 1]
  i += 1
}

const payload = {
  deviceId: 'alisagro-01',
  temperature: Number(flags.temp ?? 27.4),
  humidity: Number(flags.humidity ?? 61.2),
  soilMoisture: Number(flags.soil ?? 48.7),
}

if (flags['soil-temp']) payload.soilTemperature = Number(flags['soil-temp'])

console.log(JSON.stringify(payload, null, 2))

if (flags['dry-run'] !== undefined) {
  console.log('Dry run: no se publicó.')
  process.exit(0)
}

const result = spawnSync('aws', [
  'iot-data', 'publish',
  '--region', region,
  '--topic', topic,
  '--cli-binary-format', 'raw-in-base64-out',
  '--payload', JSON.stringify(payload),
], { stdio: 'inherit' })

if (result.error) {
  console.error('No se encontró AWS CLI. El JSON de arriba es el que publicaría el Wemos.')
  process.exit(1)
}

process.exit(result.status ?? 1)
