#!/usr/bin/env python3
"""
tests/run_tests.py

Ejecuta los prompts de prueba contra la API de IA, recopila respuestas
y metadatos de búsqueda, y genera un resumen de tokens al finalizar.

Uso:
    python tests/run_tests.py
    python tests/run_tests.py --url http://localhost:8000 --delay 7
    python tests/run_tests.py --user admin --password secret
"""

import argparse
import json
import time
from datetime import datetime
from pathlib import Path

import httpx

from backend.tests.legacy.prompts import PROMPTS

# ---------------------------------------------------------------------------
# Configuración por defecto
# ---------------------------------------------------------------------------
DEFAULT_URL   = "http://localhost:8000"
DEFAULT_USER  = "sebas"
DEFAULT_PASS  = "sebas123"
DEFAULT_DELAY = 7  # segundos entre preguntas


# ---------------------------------------------------------------------------
# Helpers de impresión
# ---------------------------------------------------------------------------

def separador(char: str = "─", ancho: int = 70) -> str:
    return char * ancho


def imprimir_resultado(n: int, prompt: dict, resultado: dict) -> None:
    r = resultado
    debug = r.get("debug") or {}

    modo_obtenido  = debug.get("modo_busqueda", "desconocido")
    modo_esperado  = prompt.get("modo_esperado", "?")
    coincide       = "✅" if modo_obtenido == modo_esperado else "❌"

    print(separador())
    print(f"[{n}] {prompt['pregunta']}")
    print(separador("·"))
    print(f"  Modo esperado : {modo_esperado}")
    print(f"  Modo obtenido : {modo_obtenido}  {coincide}")
    print(f"  Filtros       : {debug.get('filtros_aplicados', {})}")
    print(f"  Términos      : {debug.get('terminos_detectados', [])}")
    print(f"  Cepas ctx/DB  : {debug.get('cepas_en_contexto', '?')} / {debug.get('total_en_db', '?')}")
    print(f"  Tokens env/rec: {r.get('tokens_enviados', '?')} / {r.get('tokens_recibidos', '?')}  "
          f"(total: {r.get('tokens_usados', '?')})")
    print(f"  Tiempo        : {r.get('tiempo_respuesta_ms', '?')} ms")
    print(f"  Respuesta     :\n    {r.get('respuesta', '').replace(chr(10), chr(10) + '    ')}")


def imprimir_resumen(resultados: list[dict], prompts: list[dict], tiempo_total: float) -> None:
    print("\n" + separador("═"))
    print("RESUMEN FINAL")
    print(separador("═"))

    total_enviados  = sum(r.get("tokens_enviados")  or 0 for r in resultados)
    total_recibidos = sum(r.get("tokens_recibidos") or 0 for r in resultados)
    total_tokens    = sum(r.get("tokens_usados")    or 0 for r in resultados)

    modos_correctos = sum(
        1 for i, r in enumerate(resultados)
        if (r.get("debug") or {}).get("modo_busqueda") == prompts[i].get("modo_esperado")
    )
    errores = sum(1 for r in resultados if r.get("error"))

    print(f"  Preguntas ejecutadas : {len(resultados)}")
    print(f"  Errores              : {errores}")
    print(f"  Modos correctos      : {modos_correctos} / {len(resultados)}")
    print(f"  Tiempo total         : {tiempo_total:.1f} s")
    print()
    print(f"  Tokens enviados      : {total_enviados:,}")
    print(f"  Tokens recibidos     : {total_recibidos:,}")
    print(f"  Tokens totales       : {total_tokens:,}")
    print(separador("═"))


# ---------------------------------------------------------------------------
# Cliente API
# ---------------------------------------------------------------------------

class APIClient:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.token: str | None = None
        self.client = httpx.Client(timeout=60.0)

    def login(self, username: str, password: str) -> None:
        print(f"🔐 Autenticando como '{username}'...")
        resp = self.client.post(
            f"{self.base_url}/auth/login",
            data={"username": username, "password": password},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        resp.raise_for_status()
        self.token = resp.json().get("access_token")
        if not self.token:
            raise ValueError("No se recibió access_token en la respuesta de login")
        print("   ✅ Login exitoso\n")

    def preguntar(self, pregunta: str) -> dict:
        if not self.token:
            raise RuntimeError("No autenticado. Llama a login() primero.")
        resp = self.client.post(
            f"{self.base_url}/chat/query",
            json={"pregunta": pregunta, "incluir_fuentes": True},
            headers={"Authorization": f"Bearer {self.token}"},
        )
        resp.raise_for_status()
        return resp.json()

    def close(self) -> None:
        self.client.close()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Test runner para la API de IA de cepas")
    parser.add_argument("--url",      default=DEFAULT_URL,   help="URL base de la API")
    parser.add_argument("--user",     default=DEFAULT_USER,  help="Usuario para login")
    parser.add_argument("--password", default=DEFAULT_PASS,  help="Contraseña para login")
    parser.add_argument("--delay",    default=DEFAULT_DELAY, type=float,
                        help="Segundos de espera entre preguntas")
    parser.add_argument("--output",   default=None,
                        help="Archivo JSON donde guardar resultados (opcional)")
    args = parser.parse_args()

    print(separador("═"))
    print("TEST RUNNER — API IA Cepas")
    print(f"URL: {args.url}  |  Delay: {args.delay}s  |  Prompts: {len(PROMPTS)}")
    print(separador("═") + "\n")

    client = APIClient(args.url)
    client.login(args.user, args.password)

    resultados: list[dict] = []
    inicio_total = time.time()

    for i, prompt in enumerate(PROMPTS, start=1):
        print(f"\n⏳ Enviando pregunta {i}/{len(PROMPTS)}...")
        try:
            resultado = client.preguntar(prompt["pregunta"])
            resultado["error"] = None
        except httpx.HTTPStatusError as e:
            print(f"   ❌ Error HTTP {e.response.status_code}: {e.response.text[:200]}")
            resultado = {"error": str(e), "pregunta": prompt["pregunta"]}
        except Exception as e:
            print(f"   ❌ Error: {e}")
            resultado = {"error": str(e), "pregunta": prompt["pregunta"]}

        resultado["_pregunta"] = prompt["pregunta"]
        resultado["_modo_esperado"] = prompt.get("modo_esperado")
        resultados.append(resultado)

        imprimir_resultado(i, prompt, resultado)

        if i < len(PROMPTS):
            print(f"\n   ⏱  Esperando {args.delay}s antes de la siguiente pregunta...")
            time.sleep(args.delay)

    tiempo_total = time.time() - inicio_total
    client.close()

    imprimir_resumen(resultados, PROMPTS, tiempo_total)

    # Guardar resultados en JSON si se especificó output
    output_path = args.output or f"resultados_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    Path(output_path).write_text(
        json.dumps(resultados, ensure_ascii=False, indent=2, default=str),
        encoding="utf-8",
    )
    print(f"\n💾 Resultados guardados en: {output_path}")


if __name__ == "__main__":
    main()
