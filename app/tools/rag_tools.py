"""
app/tools/rag_tools.py
"""
from langchain_core.tools import tool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.services.embeddings import embedding_service
from typing import Dict, Any, List

@tool
async def retrieve_rag_context(
    db: AsyncSession,
    query: str,
    conversacion_id: str,
    extracted_data: Dict[str, Any]
) -> str:
    """
    Recupera contexto RAG completo en UNA llamada:
    1. Mensajes previos similares
    2. Conocimiento base
    3. Patrones exitosos
    4. Productos relevantes por sector
    """
    
    query_embedding = embedding_service.encode_single(query)
    sector = extracted_data.get("sector")
    
    context_parts = []
    
    similar_msgs = await db.execute(
        text("""
            SELECT contenido, rol
            FROM mensajes
            WHERE conversacion_id = :conv_id
              AND embedding IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 3
        """),
        {"conv_id": conversacion_id}
    )
    
    msgs = similar_msgs.fetchall()
    if msgs:
        context_parts.append("CONTEXTO PREVIO:")
        for contenido, rol in msgs:
            context_parts.append(f"[{rol}] {contenido[:100]}")
    
    conocimiento = await db.execute(
        text("""
            SELECT tipo, titulo, contenido,
                   1 - (embedding <=> CAST(:embedding AS vector)) as sim
            FROM conocimiento_rag
            WHERE activo = TRUE
              AND (1 - (embedding <=> CAST(:embedding AS vector))) >= 0.7
            ORDER BY embedding <=> CAST(:embedding AS vector)
            LIMIT 2
        """),
        {"embedding": str(query_embedding)}
    )
    
    know_rows = conocimiento.fetchall()
    if know_rows:
        context_parts.append("\nCONOCIMIENTO:")
        for tipo, titulo, contenido, sim in know_rows:
            context_parts.append(f"[{tipo}] {titulo}: {contenido[:200]}")
    
    patrones = await db.execute(
        text("""
            SELECT tipo_patron, respuesta_agente, tasa_exito
            FROM patrones_aprendidos
            WHERE aprobado_para_uso = TRUE
              AND tasa_exito >= 70
              AND (1 - (embedding_contexto <=> CAST(:embedding AS vector))) >= 0.75
            ORDER BY tasa_exito DESC
            LIMIT 2
        """),
        {"embedding": str(query_embedding)}
    )
    
    patron_rows = patrones.fetchall()
    if patron_rows:
        context_parts.append("\nPATRONES EXITOSOS:")
        for tipo, respuesta, tasa in patron_rows:
            context_parts.append(f"[{tipo}] {tasa}% éxito: {respuesta[:150]}")
    
    if sector:
        productos = await db.execute(
            text("""
                SELECT p.nombre, p.descripcion_corta, p.precio_base,
                       json_agg(
                           json_build_object(
                               'nombre', pk.nombre,
                               'precio', pk.precio_mensual
                           )
                       ) FILTER (WHERE pk.id IS NOT NULL) as paquetes
                FROM productos p
                LEFT JOIN paquetes pk ON pk.producto_id = p.id AND pk.activo = TRUE
                WHERE p.activo = TRUE
                  AND :sector = ANY(p.sectores)
                GROUP BY p.id
                LIMIT 2
            """),
            {"sector": sector}
        )
    else:
        productos = await db.execute(
            text("""
                SELECT p.nombre, p.descripcion_corta, p.precio_base,
                       json_agg(
                           json_build_object(
                               'nombre', pk.nombre,
                               'precio', pk.precio_mensual
                           )
                       ) FILTER (WHERE pk.id IS NOT NULL) as paquetes
                FROM productos p
                LEFT JOIN paquetes pk ON pk.producto_id = p.id AND pk.destacado = TRUE
                WHERE p.activo = TRUE
                GROUP BY p.id
                LIMIT 2
            """)
        )
    
    prod_rows = productos.fetchall()
    if prod_rows:
        context_parts.append("\nPRODUCTOS RECOMENDADOS:")
        for nombre, desc, precio, paquetes in prod_rows:
            context_parts.append(f"- {nombre} (S/ {precio}): {desc}")
            if paquetes:
                for paq in paquetes[:2]:
                    context_parts.append(f"  · {paq['nombre']}: S/ {paq['precio']}/mes")
    
    return "\n".join(context_parts) if context_parts else ""