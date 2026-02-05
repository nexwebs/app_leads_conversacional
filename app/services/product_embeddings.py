"""
app/services/product_embeddings.py
Generación directa de embeddings al modificar productos
Sin schedulers, sin colas en memoria, sin triggers pesados
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.services.embeddings import embedding_service
import json
import traceback
from typing import Optional


async def generar_embedding_producto(db: AsyncSession, producto_id: str) -> bool:
    """
    Genera embedding inmediatamente después de crear/actualizar producto
    Ejecuta en la misma transacción del endpoint
    """
    try:
        result = await db.execute(
            text("""
                SELECT 
                    p.id,
                    p.nombre,
                    p.descripcion_corta,
                    p.precio_base,
                    p.sectores,
                    p.features,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'nombre', pk.nombre,
                                'precio_mensual', pk.precio_mensual,
                                'ideal_para', pk.ideal_para
                            ) ORDER BY pk.precio_mensual
                        ) FILTER (WHERE pk.id IS NOT NULL),
                        '[]'::json
                    ) as paquetes
                FROM productos p
                LEFT JOIN paquetes pk ON pk.producto_id = p.id AND pk.activo = TRUE
                WHERE p.id = :producto_id AND p.activo = TRUE
                GROUP BY p.id
            """),
            {"producto_id": producto_id}
        )
        
        row = result.fetchone()
        if not row:
            return False
        
        producto_id_db = str(row[0])
        nombre = row[1]
        desc = row[2]
        precio = float(row[3])
        sectores = row[4] or []
        features = row[5] or []
        paquetes = row[6] or []
        
        texto_completo = f"""PRODUCTO: {nombre}

DESCRIPCIÓN: {desc}

PRECIO BASE: S/{precio}

SECTORES IDEALES: {', '.join(sectores) if sectores else 'Todos'}

CARACTERÍSTICAS:
{chr(10).join(f"- {f}" for f in features) if features else "N/A"}

PAQUETES DISPONIBLES:
"""
        
        if paquetes:
            for paq in paquetes:
                texto_completo += f"\n- {paq['nombre']}: S/{paq['precio_mensual']}/mes"
                if paq.get('ideal_para'):
                    texto_completo += f" (Ideal: {', '.join(paq['ideal_para'])})"
        
        embedding = embedding_service.encode_single(texto_completo)
        
        await db.execute(
            text("""
                DELETE FROM conocimiento_rag 
                WHERE tipo = 'guia_producto' 
                AND metadata->>'producto_id' = :producto_id
            """),
            {"producto_id": producto_id_db}
        )
        
        metadata_dict = {
            "origen": "sistema",
            "categoria": "producto",
            "producto_id": producto_id_db
        }
        
        await db.execute(
            text("""
                INSERT INTO conocimiento_rag 
                (tipo, titulo, contenido, embedding, activo, metadata)
                VALUES 
                (:tipo, :titulo, :contenido, CAST(:embedding AS vector), :activo, :metadata)
            """),
            {
                "tipo": "guia_producto",
                "titulo": f"Producto: {nombre}",
                "contenido": texto_completo,
                "embedding": str(embedding),
                "activo": True,
                "metadata": json.dumps(metadata_dict)
            }
        )
        
        print(f"✅ Embedding generado: {nombre}", flush=True)
        return True
        
    except Exception as e:
        error_detail = traceback.format_exc()
        print(f"❌ Error generando embedding: {e}\n{error_detail}", flush=True)
        raise


async def eliminar_embedding_producto(db: AsyncSession, producto_id: str) -> bool:
    """Elimina embedding cuando se borra un producto"""
    try:
        await db.execute(
            text("""
                DELETE FROM conocimiento_rag 
                WHERE tipo = 'guia_producto' 
                AND metadata->>'producto_id' = :producto_id
            """),
            {"producto_id": producto_id}
        )
        return True
    except Exception as e:
        print(f"❌ Error eliminando embedding: {e}", flush=True)
        return False