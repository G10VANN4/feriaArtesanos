import requests
import json
import time

BASE_URL = "http://localhost:5000"
TEST_EMAIL = f"test_{int(time.time())}@example.com"
TEST_PASSWORD = "password123"

def print_step(step, message):
    print(f"\n{'='*60}")
    print(f"🚀 PASO {step}: {message}")
    print(f"{'='*60}")

def test_sesion_unica_con_cookies():
    # Crear dos sesiones independientes (como dos navegadores diferentes)
    session1 = requests.Session()
    session2 = requests.Session()
    
    try:
        # Paso 1: Registro
        print_step(1, "REGISTRO DE USUARIO")
        register_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        response = session1.post(f"{BASE_URL}/auth/register", json=register_data)
        print(f"📝 Registro: {response.status_code} - {response.json()}")
        
        # Paso 2: Primer Login con Sesión 1
        print_step(2, "PRIMER LOGIN - SESIÓN 1 (Chrome)")
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        response = session1.post(f"{BASE_URL}/auth/login", json=login_data)
        print(f"🔐 Login 1: {response.status_code}")
        print(f"🍪 Cookies Sesión 1: {session1.cookies.get_dict()}")
        
        # Paso 3: Verificar que Sesión 1 funciona
        print_step(3, "VERIFICAR SESIÓN 1 (debería funcionar)")
        response = session1.get(f"{BASE_URL}/auth/check-auth")
        print(f"✅ Check-auth Sesión 1: {response.status_code} - {response.json()}")
        
        # Paso 4: Segundo Login con Sesión 2 (debería revocar Sesión 1)
        print_step(4, "SEGUNDO LOGIN - SESIÓN 2 (Incognito) - DEBERÍA REVOCAR SESIÓN 1")
        response = session2.post(f"{BASE_URL}/auth/login", json=login_data)
        print(f"🔐 Login 2: {response.status_code}")
        print(f"🍪 Cookies Sesión 2: {session2.cookies.get_dict()}")
        
        # Verificar tablas después del segundo login
        print("\n📊 ESTADO DESPUÉS DEL SEGUNDO LOGIN:")
        response = session1.get(f"{BASE_URL}/system/debug-tables")
        if response.status_code == 200:
            print(json.dumps(response.json(), indent=2))
        
        # Paso 5: Verificar que Sesión 1 está revocada
        print_step(5, "VERIFICAR SESIÓN 1 REVOCADA (debería fallar)")
        response = session1.get(f"{BASE_URL}/auth/check-auth")
        print(f"❌ Check-auth Sesión 1 (revocada): {response.status_code}")
        if response.status_code == 401:
            print("🎉 ✅ SESIÓN 1 CORRECTAMENTE REVOCADA!")
        else:
            print(f"💥 ❌ ERROR: Sesión 1 aún funciona! Response: {response.json()}")
        
        # Paso 6: Verificar que Sesión 2 funciona
        print_step(6, "VERIFICAR SESIÓN 2 FUNCIONA")
        response = session2.get(f"{BASE_URL}/auth/check-auth")
        print(f"✅ Check-auth Sesión 2: {response.status_code} - {response.json()}")
        if response.status_code == 200:
            print("🎉 ✅ SESIÓN 2 FUNCIONA CORRECTAMENTE!")
        
        # Paso 7: Logout con Sesión 2
        print_step(7, "LOGOUT CON SESIÓN 2")
        response = session2.post(f"{BASE_URL}/auth/logout")
        print(f"🚪 Logout: {response.status_code} - {response.json()}")
        
        print("\n🎉 PRUEBA COMPLETADA!")
        
    except Exception as e:
        print(f"❌ Error en la prueba: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_sesion_unica_con_cookies()