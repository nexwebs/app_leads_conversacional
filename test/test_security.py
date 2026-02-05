import requests
import time
import json
from datetime import datetime
import sys

BASE_URL = "http://localhost:8001"

def print_test(test_name, status, message):
    status_icon = "✅" if status else "❌"
    print(f"{status_icon} {test_name}: {message}")
    return status

def test_rate_limiting():
    print("\n" + "="*60)
    print("🔒 TEST 1: Rate Limiting")
    print("="*60)
    
    url = f"{BASE_URL}/api/v1/leads"
    results = []
    
    for i in range(15):
        try:
            r = requests.post(
                url, 
                json={"email": f"test{i}@test.com"},
                timeout=5
            )
            results.append(r.status_code)
            print(f"  Request {i+1}: {r.status_code}")
            time.sleep(0.1)
        except Exception as e:
            print(f"  Request {i+1}: Error - {e}")
            results.append(0)
    
    success_count = sum(1 for code in results if code in [200, 201])
    blocked_count = sum(1 for code in results if code == 429)
    
    passed = success_count <= 10 and blocked_count >= 4
    return print_test(
        "Rate Limiting", 
        passed,
        f"{success_count} exitosas, {blocked_count} bloqueadas (esperado: ≤10 exitosas, ≥4 bloqueadas)"
    )

def test_security_headers():
    print("\n" + "="*60)
    print("🔒 TEST 2: Security Headers")
    print("="*60)
    
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=5)
        headers = r.headers
        
        required_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block"
        }
        
        all_present = True
        for header, expected_value in required_headers.items():
            if header in headers:
                print(f"  ✅ {header}: {headers[header]}")
            else:
                print(f"  ❌ {header}: MISSING")
                all_present = False
        
        return print_test(
            "Security Headers",
            all_present,
            "Todos los headers presentes" if all_present else "Faltan headers"
        )
    except Exception as e:
        return print_test("Security Headers", False, f"Error: {e}")

def test_cors():
    print("\n" + "="*60)
    print("🔒 TEST 3: CORS Configuration")
    print("="*60)
    
    try:
        r = requests.options(
            f"{BASE_URL}/api/v1/leads",
            headers={"Origin": "http://malicious-site.com"},
            timeout=5
        )
        
        allowed_origins = r.headers.get("Access-Control-Allow-Origin", "")
        
        if allowed_origins == "*":
            return print_test(
                "CORS",
                False,
                "WILDCARD detectado - INSEGURO"
            )
        elif "malicious" not in allowed_origins.lower():
            return print_test(
                "CORS",
                True,
                "Orígenes maliciosos bloqueados"
            )
        else:
            return print_test(
                "CORS",
                False,
                "Origen malicioso permitido"
            )
    except Exception as e:
        return print_test("CORS", False, f"Error: {e}")

def test_large_payload():
    print("\n" + "="*60)
    print("🔒 TEST 4: Large Payload Protection")
    print("="*60)
    
    try:
        large_payload = {"data": "x" * (3 * 1024 * 1024)}
        
        r = requests.post(
            f"{BASE_URL}/api/v1/leads",
            json=large_payload,
            timeout=5
        )
        
        if r.status_code == 413:
            return print_test(
                "Large Payload",
                True,
                "Payload grande rechazado (413)"
            )
        else:
            return print_test(
                "Large Payload",
                False,
                f"Payload aceptado (status: {r.status_code})"
            )
    except requests.exceptions.ConnectionError:
        return print_test(
            "Large Payload",
            True,
            "Payload rechazado por el servidor"
        )
    except Exception as e:
        return print_test("Large Payload", False, f"Error: {e}")

def test_auth_rate_limiting():
    print("\n" + "="*60)
    print("🔒 TEST 5: Auth Rate Limiting")
    print("="*60)
    
    url = f"{BASE_URL}/api/v1/auth/login"
    results = []
    
    for i in range(8):
        try:
            r = requests.post(
                url,
                json={"email": "fake@test.com", "password": "fake"},
                timeout=5
            )
            results.append(r.status_code)
            print(f"  Login attempt {i+1}: {r.status_code}")
            time.sleep(0.2)
        except Exception as e:
            print(f"  Login attempt {i+1}: Error - {e}")
            results.append(0)
    
    blocked_count = sum(1 for code in results if code == 429)
    
    passed = blocked_count >= 2
    return print_test(
        "Auth Rate Limiting",
        passed,
        f"{blocked_count} bloqueadas (esperado: ≥2)"
    )

def test_health_endpoint():
    print("\n" + "="*60)
    print("🔒 TEST 6: Health Endpoint")
    print("="*60)
    
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=5)
        
        if r.status_code == 200:
            data = r.json()
            
            has_security = "security" in data
            has_memory = "memory" in data
            
            print(f"  Status: {r.status_code}")
            print(f"  Security info: {'✅' if has_security else '❌'}")
            print(f"  Memory info: {'✅' if has_memory else '❌'}")
            
            return print_test(
                "Health Endpoint",
                has_security,
                "Endpoint responde con info de seguridad"
            )
        else:
            return print_test(
                "Health Endpoint",
                False,
                f"Status inesperado: {r.status_code}"
            )
    except Exception as e:
        return print_test("Health Endpoint", False, f"Error: {e}")

def test_websocket_limits():
    print("\n" + "="*60)
    print("🔒 TEST 7: WebSocket Connection Limits")
    print("="*60)
    
    print("  ⚠️  Test manual requerido")
    print("  Para testear WebSocket:")
    print("  1. Intentar 4 conexiones simultáneas desde misma IP")
    print("  2. Verificar que 4ta conexión sea rechazada")
    return True

def main():
    print("="*60)
    print("🔒 SUITE DE TESTS DE SEGURIDAD")
    print("="*60)
    print(f"Target: {BASE_URL}")
    print(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=3)
        print("✅ Servidor accesible")
    except Exception as e:
        print(f"❌ Servidor no accesible: {e}")
        print("\n⚠️  Asegúrate de que el servidor esté corriendo:")
        print("   python -m uvicorn app.main:app --reload")
        sys.exit(1)
    
    results = []
    
    results.append(test_rate_limiting())
    time.sleep(2)
    
    results.append(test_security_headers())
    
    results.append(test_cors())
    
    results.append(test_large_payload())
    
    results.append(test_auth_rate_limiting())
    time.sleep(2)
    
    results.append(test_health_endpoint())
    
    test_websocket_limits()
    
    print("\n" + "="*60)
    print("📊 RESUMEN")
    print("="*60)
    
    passed = sum(results)
    total = len(results)
    percentage = (passed / total) * 100 if total > 0 else 0
    
    print(f"Tests pasados: {passed}/{total} ({percentage:.1f}%)")
    
    if passed == total:
        print("✅ TODOS LOS TESTS PASARON")
        print("🚀 Sistema listo para producción")
        sys.exit(0)
    else:
        print("❌ ALGUNOS TESTS FALLARON")
        print("⚠️  Revisar configuración antes de desplegar")
        sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrumpidos por el usuario")
        sys.exit(1)