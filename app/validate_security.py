import os
import sys
from pathlib import Path

print("=" * 70)
print(" VALIDACIÓN DE CONFIGURACIÓN DE SEGURIDAD")
print("=" * 70)

issues = []
warnings = []
success = []

env_path = Path(".env")
if not env_path.exists():
    issues.append("❌ Archivo .env no encontrado")
else:
    success.append("✅ Archivo .env encontrado")
    
    with open(env_path) as f:
        env_content = f.read()
    
    if "SECRET_KEY=CAMBIAR-EN-PRODUCCION" in env_content or "SECRET_KEY=" not in env_content:
        issues.append("❌ SECRET_KEY no configurada o usa valor por defecto")
    else:
        secret_key = [line for line in env_content.split("\n") if line.startswith("SECRET_KEY=")]
        if secret_key:
            key_length = len(secret_key[0].split("=")[1])
            if key_length < 32:
                warnings.append(f"⚠️  SECRET_KEY muy corta ({key_length} chars, recomendado: 64)")
            else:
                success.append(f"✅ SECRET_KEY configurada ({key_length} chars)")
    
    if "APP_ENV=production" in env_content:
        success.append("✅ APP_ENV=production configurado")
        
        if "DOMAIN=localhost" in env_content or "DOMAIN=" not in env_content:
            issues.append("❌ DOMAIN en producción no debe ser 'localhost'")
        else:
            success.append("✅ DOMAIN configurado para producción")
        
        if "USE_SSL=true" not in env_content:
            warnings.append("⚠️  USE_SSL no está en 'true' para producción")
        else:
            success.append("✅ USE_SSL=true configurado")
    else:
        warnings.append("⚠️  APP_ENV no está en 'production'")
    
    if "OPENAI_API_KEY=" not in env_content or "OPENAI_API_KEY=\n" in env_content:
        issues.append("❌ OPENAI_API_KEY no configurada")
    else:
        success.append("✅ OPENAI_API_KEY configurada")
    
    if "DATABASE_URL=" not in env_content:
        issues.append("❌ DATABASE_URL no configurada")
    else:
        success.append("✅ DATABASE_URL configurada")

config_path = Path("app/config.py")
if not config_path.exists():
    issues.append("❌ app/config.py no encontrado")
else:
    with open(config_path) as f:
        config_content = f.read()
    
    if "ACCESS_TOKEN_EXPIRE_MINUTES: int = 30" in config_content:
        success.append("✅ JWT expiration en 30 minutos")
    elif "ACCESS_TOKEN_EXPIRE_MINUTES: int = 480" in config_content:
        issues.append("❌ JWT expiration en 480 minutos (demasiado largo)")
    else:
        warnings.append("⚠️  JWT expiration no está en valor recomendado (30 min)")
    
    if '"*"' in config_content and "CORS_ORIGINS" in config_content:
        issues.append("❌ CORS permite wildcard '*' - riesgo de seguridad")
    else:
        success.append("✅ CORS no tiene wildcard")
    
    if "RATE_LIMIT_PUBLIC_RPM" in config_content:
        success.append("✅ Rate limiting configurado")
    else:
        issues.append("❌ Rate limiting no configurado")

security_middleware_path = Path("app/middleware/security.py")
if not security_middleware_path.exists():
    issues.append("❌ app/middleware/security.py no encontrado")
else:
    success.append("✅ Middleware de seguridad presente")

main_path = Path("app/main.py")
if not main_path.exists():
    issues.append("❌ app/main.py no encontrado")
else:
    with open(main_path) as f:
        main_content = f.read()
    
    if "SecurityHeadersMiddleware" in main_content:
        success.append("✅ Security headers middleware aplicado")
    else:
        issues.append("❌ Security headers middleware NO aplicado")
    
    if "RateLimitMiddleware" in main_content:
        success.append("✅ Rate limit middleware aplicado")
    else:
        issues.append("❌ Rate limit middleware NO aplicado")
    
    if "InputValidationMiddleware" in main_content:
        success.append("✅ Input validation middleware aplicado")
    else:
        issues.append("❌ Input validation middleware NO aplicado")

print("\n🟢 CONFIGURACIONES CORRECTAS:")
for item in success:
    print(f"  {item}")

if warnings:
    print("\n🟡 ADVERTENCIAS:")
    for item in warnings:
        print(f"  {item}")

if issues:
    print("\n🔴 PROBLEMAS CRÍTICOS:")
    for item in issues:
        print(f"  {item}")
    print("\n❌ Corrije estos problemas antes de desplegar a producción")
    sys.exit(1)
else:
    print("\n" + "=" * 70)
    print("✅ TODAS LAS VALIDACIONES PASARON")
    print("=" * 70)
    print("\n🚀 Sistema listo para producción")
    sys.exit(0)