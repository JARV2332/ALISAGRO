# Borra únicamente el stack alisagro-aws-demo y, si se pide, el Thing de la demo.
# Uso:
#   .\destroy-demo.ps1 -Confirm
#   .\destroy-demo.ps1 -Confirm -IncludeThing

param(
  [switch]$Confirm,
  [switch]$IncludeThing,
  [string]$Region = "us-east-1",
  [string]$StackName = "alisagro-aws-demo",
  [string]$ThingName = "alisagro-01",
  [string]$PolicyName = "alisagro-demo-device"
)

if (-not $Confirm) {
  throw "Este script borra la demo. Vuelve a ejecutarlo con -Confirm."
}

$ErrorActionPreference = "Stop"
sam delete --stack-name $StackName --region $Region --no-prompts

if ($IncludeThing) {
  $principals = aws iot list-thing-principals --thing-name $ThingName --region $Region --query principals --output text 2>$null
  if ($principals) {
    foreach ($arn in ($principals -split "\s+")) {
      if (-not $arn) { continue }
      aws iot detach-thing-principal --thing-name $ThingName --principal $arn --region $Region | Out-Null
      aws iot detach-policy --policy-name $PolicyName --target $arn --region $Region 2>$null | Out-Null
      $certId = ($arn -split "/")[-1]
      aws iot update-certificate --certificate-id $certId --new-status INACTIVE --region $Region | Out-Null
      aws iot delete-certificate --certificate-id $certId --region $Region | Out-Null
    }
  }
  aws iot delete-policy --policy-name $PolicyName --region $Region 2>$null | Out-Null
  aws iot delete-thing --thing-name $ThingName --region $Region | Out-Null
  Write-Output "Thing $ThingName eliminado."
}

Write-Output "Stack $StackName eliminado en $Region."
Write-Output "Revisa en S3 si quedó el bucket de artefactos de SAM y vacíalo si ya no lo usas."
