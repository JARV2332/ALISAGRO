# Infraestructura de la demo

Stack SAM `alisagro-aws-demo` en **us-east-1**.

```powershell
sam build
sam deploy --guided
```

Pide la URL de Supabase y la clave publishable en el momento. No las escribas en `samconfig.toml` si ese archivo se va a commitear.

El Thing y el certificado no están en la plantilla, porque la llave privada solo se entrega una vez:

```powershell
.\scripts\provision-thing.ps1 -WifiSsid "TU_RED" -WifiPassword "TU_CLAVE"
```

Borrar solo esta demo:

```powershell
.\scripts\destroy-demo.ps1 -Confirm -IncludeThing
```

Guía completa: `DEMO-AWS.md` en la raíz del proyecto.
