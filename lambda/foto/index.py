"""Cuando la Pi deja una foto en S3, esto anota la fila para que /aws la muestre."""

import json
import os
from urllib.parse import unquote_plus
from urllib.request import Request, urlopen

import boto3

s3 = boto3.client("s3")
REGION = os.environ.get("AWS_REGION", "us-east-1")
DIAS = 7


def _numero(meta, clave):
    crudo = (meta or {}).get(clave, "")
    try:
        valor = float(crudo)
    except (TypeError, ValueError):
        return None
    if valor < 0 or valor > 100:
        return None
    return round(valor, 1)


def armar_fila(bucket, key, meta):
    device = (meta or {}).get("device") or "alisagro-pi"
    device = "".join(ch for ch in device if ch.isalnum() or ch in "-_")[:40] or "alisagro-pi"
    url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=DIAS * 24 * 3600,
    )
    return {
        "device_id": device,
        "bucket": bucket,
        "objeto": key,
        "url": url,
        "cobertura": _numero(meta, "cobertura"),
        "verde": _numero(meta, "verde"),
        "amarillo": _numero(meta, "amarillo"),
        "seco": _numero(meta, "seco"),
    }


def handler(event, _context):
    records = event.get("Records") or []
    if not records:
        return {"ok": False, "error": "sin registros"}

    base = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key_api = os.environ.get("SUPABASE_KEY", "")
    table = os.environ.get("SUPABASE_TABLE", "ali_fotos_aws_demo")
    if not base or not key_api:
        raise RuntimeError("Faltan SUPABASE_URL o SUPABASE_KEY")

    guardadas = 0
    for record in records:
        bucket = record["s3"]["bucket"]["name"]
        objeto = unquote_plus(record["s3"]["object"]["key"])
        if not objeto.startswith("fotos/") or not objeto.endswith(".jpg"):
            continue
        head = s3.head_object(Bucket=bucket, Key=objeto)
        fila = armar_fila(bucket, objeto, head.get("Metadata") or {})
        cuerpo = json.dumps(fila).encode("utf-8")
        peticion = Request(
            f"{base}/rest/v1/{table}",
            data=cuerpo,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "apikey": key_api,
                "Authorization": f"Bearer {key_api}",
                "Prefer": "return=minimal",
            },
        )
        with urlopen(peticion, timeout=8) as respuesta:
            if respuesta.status >= 300:
                raise RuntimeError(f"Supabase respondió {respuesta.status}")
        guardadas += 1

    print(json.dumps({"ok": True, "guardadas": guardadas}))
    return {"ok": True, "guardadas": guardadas}
