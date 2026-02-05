import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.config import settings
import json

async def debug_last_conversation():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        print("\n" + "="*60)
        print("  DIAGNÓSTICO DE ÚLTIMA CONVERSACIÓN")
        print("="*60 + "\n")
        
        result = await db.execute(
            text("""
                SELECT 
                    c.session_id,
                    c.estado_agente,
                    c.probabilidad_compra,
                    l.nombre_completo,
                    l.sector,
                    COUNT(m.id) as total_msgs
                FROM conversaciones c
                LEFT JOIN leads l ON l.id = c.lead_id
                LEFT JOIN mensajes m ON m.conversacion_id = c.id
                WHERE c.created_at >= NOW() - INTERVAL '1 hour'
                GROUP BY c.id, c.session_id, c.estado_agente, c.probabilidad_compra, 
                         l.nombre_completo, l.sector
                ORDER BY c.created_at DESC
                LIMIT 1
            """)
        )
        
        row = result.fetchone()
        
        if not row:
            print("❌ No hay conversaciones recientes")
            return
        
        session_id = row[0]
        estado_agente = row[1]
        probabilidad = row[2]
        nombre = row[3]
        sector = row[4]
        total_msgs = row[5]
        
        print(f"Session ID: {session_id}")
        print(f"Nombre: {nombre}")
        print(f"Sector: {sector}")
        print(f"Probabilidad: {probabilidad}%")
        print(f"Total mensajes: {total_msgs}\n")
        
        print("ESTADO AGENTE:")
        print(json.dumps(estado_agente, indent=2, ensure_ascii=False))
        print("\n")
        
        extracted_data = estado_agente.get("extracted_data", {})
        producto_interes = extracted_data.get("producto_interes")
        
        if producto_interes:
            print(f"✅ Producto de interés detectado: {producto_interes}")
        else:
            print("❌ NO hay producto de interés guardado")
        
        print("\n" + "-"*60)
        print("MENSAJES DE LA CONVERSACIÓN:")
        print("-"*60 + "\n")
        
        msgs_result = await db.execute(
            text("""
                SELECT rol, contenido, created_at
                FROM mensajes
                WHERE conversacion_id = (
                    SELECT id FROM conversaciones 
                    WHERE session_id = :session_id
                )
                ORDER BY created_at ASC
            """),
            {"session_id": session_id}
        )
        
        for msg in msgs_result.fetchall():
            rol = msg[0]
            contenido = msg[1]
            timestamp = msg[2].strftime("%H:%M:%S")
            
            emoji = "👤" if rol == "user" else "🤖"
            print(f"{emoji} {rol.upper()} [{timestamp}]:")
            print(f"   {contenido}\n")
        
        print("\n" + "="*60)
        print("ANÁLISIS:")
        print("="*60 + "\n")
        
        msgs_text = await db.execute(
            text("""
                SELECT contenido
                FROM mensajes
                WHERE conversacion_id = (
                    SELECT id FROM conversaciones 
                    WHERE session_id = :session_id
                )
                AND rol = 'user'
                ORDER BY created_at ASC
            """),
            {"session_id": session_id}
        )
        
        tiene_dashboard = False
        for msg in msgs_text.fetchall():
            contenido = msg[0].lower()
            if any(kw in contenido for kw in ["dashboard", "analítico", "analytics", "métricas", "datos"]):
                tiene_dashboard = True
                print(f"✅ Mensaje con keyword 'dashboard': '{msg[0]}'")
        
        if tiene_dashboard and not producto_interes:
            print("\n⚠️ PROBLEMA DETECTADO:")
            print("   El usuario mencionó 'dashboard' pero NO se guardó en extracted_data")
            print("   Esto indica que la persistencia NO está funcionando")
        elif tiene_dashboard and producto_interes:
            print("\n✅ TODO CORRECTO:")
            print(f"   Producto '{producto_interes}' detectado y guardado correctamente")
        
        productos_recomendados = estado_agente.get("productos_recomendados", [])
        if productos_recomendados:
            print(f"\n📦 PRODUCTOS RECOMENDADOS:")
            for p in productos_recomendados:
                print(f"   - {p.get('nombre')}")
        else:
            print("\n❌ NO hay productos recomendados en estado_agente")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(debug_last_conversation())