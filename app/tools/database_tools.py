"""
app/tools/database_tools.py
"""
from langchain_core.tools import tool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, text
from app.models import Lead, Conversacion, Mensaje
from app.services.embeddings import embedding_service
from typing import Dict, Any, Optional, List
from uuid import UUID
from datetime import datetime

@tool
async def create_lead(
    db: AsyncSession,
    origen: str = "web_chat",
    metadata: Optional[Dict[str, Any]] = None
) -> str:
    """Crea un nuevo lead en la base de datos"""
    lead = Lead(
        origen=origen,
        utm_source=metadata.get("utm_source") if metadata else None,
        utm_campaign=metadata.get("utm_campaign") if metadata else None,
        estado="nuevo"
    )
    db.add(lead)
    await db.flush()
    await db.commit()
    return str(lead.id)

@tool
async def update_lead_info(
    db: AsyncSession,
    lead_id: str,
    data: Dict[str, Any]
) -> bool:
    """Actualiza información del lead con datos extraídos"""
    try:
        updates = {}
        
        if data.get("nombre"):
            updates["nombre_completo"] = data["nombre"]
        if data.get("email"):
            updates["email"] = data["email"]
        if data.get("telefono"):
            updates["telefono"] = data["telefono"]
        if data.get("empresa"):
            updates["empresa"] = data["empresa"]
        if data.get("sector"):
            updates["sector"] = data["sector"]
        if data.get("presupuesto"):
            updates["presupuesto_declarado"] = float(data["presupuesto"])
        if data.get("urgencia_dias"):
            updates["urgencia_dias"] = int(data["urgencia_dias"])
        if data.get("problema_principal"):
            updates["problema_principal"] = data["problema_principal"]
        if data.get("es_decisor") is not None:
            updates["es_decisor"] = data["es_decisor"]
        
        if updates:
            await db.execute(
                update(Lead)
                .where(Lead.id == UUID(lead_id))
                .values(**updates)
            )
            await db.commit()
            return True
        return False
    except Exception as e:
        print(f"Error actualizando lead: {e}")
        return False

@tool
async def save_message(
    db: AsyncSession,
    conversacion_id: str,
    lead_id: str,
    rol: str,
    contenido: str,
    intenciones: Optional[Dict] = None
) -> bool:
    """Guarda un mensaje en la base de datos con embedding"""
    try:
        embedding = embedding_service.encode_single(contenido)
        
        mensaje = Mensaje(
            conversacion_id=UUID(conversacion_id),
            lead_id=UUID(lead_id),
            rol=rol,
            contenido=contenido,
            embedding=embedding,
            intenciones=intenciones
        )
        db.add(mensaje)
        await db.flush()
        await db.commit()
        return True
    except Exception as e:
        print(f"Error guardando mensaje: {e}")
        await db.rollback()
        return False

@tool
async def get_conversation_state(
    db: AsyncSession,
    session_id: str
) -> Dict[str, Any]:
    """Recupera el estado completo de la conversación desde PostgreSQL"""
    result = await db.execute(
        text("SELECT get_conversation_state(:session_id)"),
        {"session_id": session_id}
    )
    state_json = result.scalar()
    return state_json if state_json else {}

@tool
async def update_conversation_state(
    db: AsyncSession,
    session_id: str,
    estado_agente: Dict[str, Any],
    probabilidad: int,
    senales_interes: List[Dict],
    senales_rechazo: List[Dict]
) -> bool:
    """Actualiza el estado de la conversación en PostgreSQL"""
    try:
        await db.execute(
            text("""
                SELECT update_conversation_state(
                    :session_id,
                    :estado_agente::jsonb,
                    :probabilidad,
                    :senales_interes::jsonb,
                    :senales_rechazo::jsonb
                )
            """),
            {
                "session_id": session_id,
                "estado_agente": estado_agente,
                "probabilidad": probabilidad,
                "senales_interes": senales_interes,
                "senales_rechazo": senales_rechazo
            }
        )
        await db.commit()
        return True
    except Exception as e:
        print(f"Error actualizando estado: {e}")
        return False

@tool
async def get_productos_activos(db: AsyncSession) -> List[Dict[str, Any]]:
    """Recupera productos activos con sus paquetes"""
    query = """
        SELECT 
            p.id::text,
            p.nombre,
            p.slug,
            p.descripcion_corta,
            p.precio_base,
            p.sectores,
            p.features,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', pk.id::text,
                        'nombre', pk.nombre,
                        'precio_mensual', pk.precio_mensual,
                        'precio_anual', pk.precio_anual,
                        'ideal_para', pk.ideal_para,
                        'destacado', pk.destacado
                    )
                ) FILTER (WHERE pk.id IS NOT NULL),
                '[]'::json
            ) as paquetes
        FROM productos p
        LEFT JOIN paquetes pk ON pk.producto_id = p.id AND pk.activo = TRUE
        WHERE p.activo = TRUE
        GROUP BY p.id
    """
    
    result = await db.execute(text(query))
    rows = result.fetchall()
    
    productos = []
    for row in rows:
        productos.append({
            "id": row[0],
            "nombre": row[1],
            "slug": row[2],
            "descripcion": row[3],
            "precio_base": float(row[4]),
            "sectores": row[5],
            "features": row[6],
            "paquetes": row[7]
        })
    
    return productos

@tool
async def search_similar_context(
    db: AsyncSession,
    conversacion_id: str,
    query: str,
    limit: int = 5
) -> List[Dict[str, Any]]:
    """Busca mensajes similares en la conversación usando embeddings"""
    query_embedding = embedding_service.encode_single(query)
    
    result = await db.execute(
        text("""
            SELECT * FROM search_similar_messages(
                CAST(:embedding AS vector),
                :conv_id,
                :limit
            )
        """),
        {
            "embedding": str(query_embedding),
            "conv_id": conversacion_id,
            "limit": limit
        }
    )
    
    rows = result.fetchall()
    
    return [
        {
            "contenido": row[0],
            "rol": row[1],
            "similitud": float(row[2]),
            "created_at": row[3].isoformat()
        }
        for row in rows
    ]