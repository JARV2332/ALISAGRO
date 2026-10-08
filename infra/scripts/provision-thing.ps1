# Crea solo los recursos de la demo: Thing alisagro-01, certificado y política.
# No borra ni modifica otros recursos de la cuenta.
# Uso:
#   .\provision-thing.ps1 -WifiSsid "MiRed" -WifiPassword "MiClave"

param(
  [Parameter(Mandatory = $true)][string]$WifiSsid,
  [Parameter(Mandatory = $true)][string]$WifiPassword,
  [string]$Region = "us-east-1",
  [string]$ThingName = "alisagro-01",
  [string]$PolicyName = "alisagro-demo-device",
  [string]$Topic = "alisagro/demo/alisagro-01/telemetry"
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$certDir = Join-Path $repoRoot "hardware\wemos-d1-mini\certs"
New-Item -ItemType Directory -Force -Path $certDir | Out-Null

$account = "$(aws sts get-caller-identity --query Account --output text --region $Region)".Trim()
if ($LASTEXITCODE -ne 0 -or -not $account) {
  throw "AWS CLI no tiene sesión. Ejecuta aws login o aws configure."
}

$endpoint = "$(aws iot describe-endpoint --endpoint-type iot:Data-ATS --region $Region --query endpointAddress --output text)".Trim()

aws iot describe-thing --thing-name $ThingName --region $Region | Out-Null
if ($LASTEXITCODE -ne 0) {
  aws iot create-thing --thing-name $ThingName --region $Region | Out-Null
}

$certPem = Join-Path $certDir "device.pem.crt"
$publicPem = Join-Path $certDir "public.pem.key"
$privatePem = Join-Path $certDir "private.pem.key"
$certArn = (aws iot create-keys-and-certificate --set-as-active --region $Region `
  --certificate-pem-outfile $certPem `
  --public-key-outfile $publicPem `
  --private-key-outfile $privatePem `
  --query certificateArn --output text).ToString().Trim()

$policy = @{
  Version = "2012-10-17"
  Statement = @(
    @{
      Effect = "Allow"
      Action = "iot:Connect"
      Resource = "arn:aws:iot:${Region}:${account}:client/${ThingName}"
    },
    @{
      Effect = "Allow"
      Action = "iot:Publish"
      Resource = "arn:aws:iot:${Region}:${account}:topic/${Topic}"
    }
  )
} | ConvertTo-Json -Depth 6 -Compress

$policyFile = Join-Path $certDir "policy.json"
Set-Content -Path $policyFile -Value $policy -Encoding ascii

$policyUri = "file://" + ($policyFile -replace '\\', '/')
aws iot get-policy --policy-name $PolicyName --region $Region | Out-Null
if ($LASTEXITCODE -ne 0) {
  aws iot create-policy --policy-name $PolicyName --policy-document $policyUri --region $Region | Out-Null
}

aws iot attach-policy --policy-name $PolicyName --target $certArn --region $Region | Out-Null
aws iot attach-thing-principal --thing-name $ThingName --principal $certArn --region $Region | Out-Null

function Escape-CString([string]$value) {
  return $value.Replace('\', '\\').Replace('"', '\"')
}

$cert = Get-Content $certPem -Raw
$key = Get-Content $privatePem -Raw
$secrets = @"
#pragma once

#define AWS_ENABLED 1
#define WIFI_SSID "$(Escape-CString $WifiSsid)"
#define WIFI_PASSWORD "$(Escape-CString $WifiPassword)"
#define AWS_IOT_ENDPOINT "$endpoint"
#define AWS_IOT_PORT 8883
#define DEVICE_ID "$ThingName"
#define MQTT_CLIENT_ID "$ThingName"
#define MQTT_TOPIC "$Topic"

static const char CLIENT_CERT[] PROGMEM = R"EOF(
$($cert.Trim())
)EOF";

static const char CLIENT_KEY[] PROGMEM = R"EOF(
$($key.Trim())
)EOF";
"@

$secretsPath = Join-Path $repoRoot "hardware\wemos-d1-mini\secrets.h"
Set-Content -Path $secretsPath -Value $secrets -Encoding ascii

Write-Output "Thing: $ThingName"
Write-Output "Endpoint: $endpoint"
Write-Output "Certificados: $certDir"
Write-Output "secrets.h listo para el Arduino IDE. No lo subas a Git."
Write-Output "Siguiente: sam deploy del stack para que la regla llame a Lambda."
