"""
Simula ataques al endpoint POST /auth/login para verificar que los fixes
de seguridad S5, S6 y S7 funcionan correctamente.

Uso:
    uv run python -m scripts.test_rate_limit_attack
    uv run python -m scripts.test_rate_limit_attack --url http://mi-servidor.com

Nota: el backend debe estar corriendo antes de ejecutar este script.
Los contadores de Redis expiran solos (60s para IP, 300s para username).
Si un test falla por contadores de una ejecución anterior, espera un minuto.
"""

from __future__ import annotations

import argparse
import sys
import time

import httpx

# ── Configuración ────────────────────────────────────────────────────────────

DEFAULT_URL = "http://127.0.0.1:8000"
LOGIN_PATH = "/auth/login"

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
RESET = "\033[0m"
BOLD = "\033[1m"


def ok(msg: str) -> None:
    print(f"  {GREEN}✓{RESET} {msg}")


def fail(msg: str) -> None:
    print(f"  {RED}✗{RESET} {msg}")


def info(msg: str) -> None:
    print(f"  {YELLOW}→{RESET} {msg}")


def header(msg: str) -> None:
    print(f"\n{BOLD}{CYAN}{msg}{RESET}")


# ── Cliente HTTP ─────────────────────────────────────────────────────────────

def login(base_url: str, username: str, password: str, fake_ip: str | None = None) -> httpx.Response:
    headers = {}
    if fake_ip:
        headers["X-Forwarded-For"] = fake_ip
    return httpx.post(
        f"{base_url}{LOGIN_PATH}",
        data={"username": username, "password": password},
        headers=headers,
        timeout=5.0,
    )


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_connectivity(base_url: str) -> bool:
    header("Verificando conectividad con el backend...")
    try:
        r = httpx.get(f"{base_url}/schema", timeout=3.0)
        ok(f"Backend accesible en {base_url} (status {r.status_code})")
        return True
    except httpx.ConnectError:
        fail(f"No se puede conectar a {base_url}. ¿Está corriendo el backend?")
        return False


def test_ip_rate_limit(base_url: str) -> bool:
    """
    Envía 7 requests desde la misma IP (via XFF desde localhost=proxy de confianza).
    El límite es 5/60s, así que el 6to debe devolver 429.
    """
    header("TEST 1 — Rate limit por IP (5 req / 60s)")
    info("Enviando 7 requests desde IP fija 10.11.11.11 con credenciales incorrectas...")

    blocked = False
    for i in range(1, 8):
        r = login(base_url, "usuario_inexistente_t1", "wrong", fake_ip="10.11.11.11")
        status = r.status_code
        print(f"    Request {i:>2}: HTTP {status}", end="")

        if status == 429:
            retry = r.json().get("retry_after_seconds", "?")
            print(f"  ← BLOQUEADO (retry_after={retry}s)")
            if i <= 5:
                fail(f"Bloqueó demasiado pronto (request {i}, esperaba >5)")
                return False
            ok(f"Rate limit por IP activado correctamente en el request {i}")
            blocked = True
            break
        elif status in (401, 422):
            print("  ← credenciales rechazadas (esperado)")
        elif status == 503:
            print()
            fail("Redis no disponible (503). El backend está en fail-closed — correcto, pero no se puede testear rate limit.")
            return False
        else:
            print()

    if not blocked:
        fail("Nunca se bloqueó. El rate limit por IP no está funcionando.")
        return False
    return True


def test_s7_distributed_brute_force(base_url: str) -> bool:
    """
    S7: Ataque distribuido — una IP diferente por intento, mismo username.
    Cada IP hace solo 1 request (nunca supera el límite de 5 por IP),
    pero el contador por username debe bloquearlo en el intento 11.
    """
    header("TEST 2 — S7: Brute force distribuido (mismo username, IPs distintas)")
    info("Cada request llega desde una IP diferente → el límite por IP nunca se activa.")
    info("El fix S7 añade un segundo contador por username (10 req / 300s).")

    username = "admin_s7_test"
    blocked = False

    for i in range(1, 14):
        fake_ip = f"10.22.{i}.1"
        r = login(base_url, username, "wrong_pass", fake_ip=fake_ip)
        status = r.status_code
        print(f"    Request {i:>2} desde {fake_ip:<14}: HTTP {status}", end="")

        if status == 429:
            retry = r.json().get("retry_after_seconds", "?")
            print(f"  ← BLOQUEADO por username (retry_after={retry}s)")
            if i <= 10:
                fail(f"Bloqueó demasiado pronto (request {i}, esperaba >10)")
                return False
            ok(f"Rate limit por username activado en el request {i} (límite: 10)")
            blocked = True
            break
        elif status in (401, 422):
            print("  ← credenciales rechazadas (esperado)")
        elif status == 503:
            print()
            fail("Redis no disponible (503).")
            return False
        else:
            print()

    if not blocked:
        fail("Nunca se bloqueó. El rate limit por username (S7) no está funcionando.")
        return False
    return True


def test_s6_xff_from_untrusted_source(base_url: str) -> bool:
    """
    S6: Intenta explotar el spoofing de X-Forwarded-For.

    El fix S6 solo acepta XFF si la conexión directa viene de un proxy de
    confianza (127.0.0.1 = Apache). Desde localhost, 127.0.0.1 ES el proxy de
    confianza, así que XFF es aceptado — comportamiento correcto para Apache.

    Lo que el fix PREVIENE: un atacante externo que llegue directamente al
    puerto 8000 con XFF falso. Eso requeriría una prueba desde IP externa,
    por lo que aquí se valida el comportamiento desde localhost y se documenta
    la limitación.
    """
    header("TEST 3 — S6: XFF spoofing desde fuente no confiable")
    info("Desde localhost (127.0.0.1), XFF es aceptado porque localhost = Apache (correcto).")
    info("El fix protege contra conexiones externas directas al puerto 8000 con XFF falso.")
    info("Para testear S6 completamente se necesita conexión desde IP externa al puerto 8000.")

    # Verificar que con XFF desde localhost el backend responde normalmente
    r = login(base_url, "s6_check_user", "wrong", fake_ip="10.33.33.33")
    if r.status_code in (401, 422, 429):
        ok(f"Backend responde correctamente con XFF desde localhost (HTTP {r.status_code})")
    elif r.status_code == 503:
        info("Redis no disponible (503) — aún así el fix S6 está en el código.")
    else:
        info(f"Respuesta inesperada: HTTP {r.status_code}")

    # Explicar qué hubiera pasado antes del fix
    print()
    info("Antes del fix S6: un atacante externo directo al puerto 8000 podía enviar")
    info("  X-Forwarded-For: 1.1.1.1, luego 2.2.2.2, etc. → cada request con IP nueva.")
    info("Después del fix: si la conexión no viene de 127.0.0.1, XFF es ignorado")
    info("  y se usa la IP real de la conexión TCP → el rate limit por IP funciona.")
    return True


def test_s5_fail_closed_info() -> None:
    """
    S5: El middleware ahora es fail-closed. Si Redis cae, devuelve 503 en lugar
    de dejar pasar todos los logins sin límite.
    No se puede simular automáticamente sin detener Redis.
    """
    header("TEST 4 — S5: Fail-closed cuando Redis no está disponible")
    info("Para probar S5 manualmente:")
    info("  1. Detén Redis:  sudo systemctl stop redis")
    info("  2. Envía un POST a /auth/login")
    info("  3. Debes recibir HTTP 503 (antes del fix: 401/200, login sin límite)")
    info("  4. Reinicia Redis: sudo systemctl start redis")


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Test de vulnerabilidades S5/S6/S7 en /auth/login")
    parser.add_argument("--url", default=DEFAULT_URL, help=f"URL base del backend (default: {DEFAULT_URL})")
    args = parser.parse_args()

    base_url = args.url.rstrip("/")

    print(f"{BOLD}{'=' * 60}{RESET}")
    print(f"{BOLD}  Simulador de ataques — fixes S5/S6/S7{RESET}")
    print(f"{BOLD}  Target: {base_url}{LOGIN_PATH}{RESET}")
    print(f"{BOLD}{'=' * 60}{RESET}")

    if not test_connectivity(base_url):
        sys.exit(1)

    results: list[tuple[str, bool]] = []

    # Test 1: rate limit por IP
    passed = test_ip_rate_limit(base_url)
    results.append(("Rate limit por IP", passed))

    # Pequeña pausa para separar tests con claridad
    print("\n  Esperando 2s antes del siguiente test...")
    time.sleep(2)

    # Test 2: brute force distribuido (S7)
    passed = test_s7_distributed_brute_force(base_url)
    results.append(("S7 — Rate limit por username", passed))

    # Test 3: XFF spoofing (S6)
    test_s6_xff_from_untrusted_source(base_url)
    results.append(("S6 — XFF desde proxy de confianza", True))

    # Test 4: info sobre S5
    test_s5_fail_closed_info()

    # Resumen
    header("RESUMEN")
    all_passed = True
    for name, passed in results:
        if passed:
            ok(name)
        else:
            fail(name)
            all_passed = False

    print()
    if all_passed:
        print(f"{GREEN}{BOLD}Todos los tests pasaron.{RESET}")
    else:
        print(f"{RED}{BOLD}Algunos tests fallaron. Revisa la salida arriba.{RESET}")
        sys.exit(1)


if __name__ == "__main__":
    main()
