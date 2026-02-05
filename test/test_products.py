import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.config import settings

async def test_product_detection():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    test_cases = [
        {
            "mensaje": "estoy interesado por un dashboard analítico",
            "esperado": "dashboard",
            "descripcion": "Dashboard explícito"
        },
        {
            "mensaje": "trabajo en el área de datos y necesito métricas",
            "esperado": "dashboard",
            "descripcion": "Keywords: datos, métricas"
        },
        {
            "mensaje": "necesito un CRM con facturación",
            "esperado": "crm-facturacion",
            "descripcion": "CRM explícito"
        },
        {
            "mensaje": "quiero automatizar cobranzas por WhatsApp",
            "esperado": "agentes-ia",
            "descripcion": "Keywords: automatizar, cobranzas, WhatsApp"
        }
    ]
    
    print("\n" + "="*60)
    print("  TEST DE DETECCIÓN DE PRODUCTOS")
    print("="*60 + "\n")
    
    async with async_session() as db:
        for i, test in enumerate(test_cases, 1):
            print(f"Test {i}: {test['descripcion']}")
            print(f"Mensaje: '{test['mensaje']}'")
            
            msg_lower = test['mensaje'].lower()
            interes_producto = None
            
            if any(kw in msg_lower for kw in ["dashboard", "analítico", "analytics", "métricas", "reportes", "datos", "visualiz"]):
                interes_producto = "dashboard"
            elif any(kw in msg_lower for kw in ["crm", "facturación", "sunat", "clientes", "ventas"]):
                interes_producto = "crm-facturacion"
            elif any(kw in msg_lower for kw in ["agente", "ia", "cobranza", "whatsapp", "automatización"]):
                interes_producto = "agentes-ia"
            
            if interes_producto:
                result = await db.execute(
                    text("""
                        SELECT p.nombre
                        FROM productos p
                        WHERE p.activo = TRUE AND p.slug = :slug
                        LIMIT 1
                    """),
                    {"slug": interes_producto}
                )
                
                producto_nombre = result.scalar()
                
                status = "✅" if interes_producto == test['esperado'] else "❌"
                print(f"Detectado: {interes_producto} → {producto_nombre}")
                print(f"Esperado: {test['esperado']}")
                print(f"Resultado: {status}\n")
            else:
                print(f"❌ NO SE DETECTÓ NINGÚN PRODUCTO\n")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_product_detection())