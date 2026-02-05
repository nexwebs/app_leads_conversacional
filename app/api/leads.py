"""
scripts/init_data.py
Script para inicializar datos y generar embeddings
"""
import asyncio
import sys
from pathlib import Path
from fastapi import APIRouter
# Agregar directorio raíz al path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, text
from app.services.database import AsyncSessionLocal
from app.models import ConocimientoRAG, Producto
from app.services.embeddings import embedding_service

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.database import get_db
from sqlalchemy import select, func, desc, and_
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone


from app.models import Lead, Conversacion, Mensaje, Usuario
from app.schemas import (
    LeadCreate, 
    LeadResponse, 
    LeadUpdate,
    ChatMessage
)
from app.api.auth import get_current_active_user

router = APIRouter()


# ============= CREAR LEAD (API PÚBLICA) =============
@router.post("/", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def crear_lead(
    lead_data: LeadCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Crear un nuevo lead desde API externa (webhook, formulario web, etc.)
    No requiere autenticación para permitir integraciones externas
    """
    # Validar que al menos email o teléfono estén presentes
    if not lead_data.email and not lead_data.telefono:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Se requiere al menos email o teléfono"
        )
    
    # Verificar si ya existe un lead con ese email o teléfono
    existing_lead = None
    if lead_data.email:
        result = await db.execute(
            select(Lead).where(Lead.email == lead_data.email)
        )
        existing_lead = result.scalar_one_or_none()
    
    if existing_lead:
        # Si el lead ya existe, actualizar sus datos
        for field, value in lead_data.model_dump(exclude_unset=True).items():
            if value is not None:
                setattr(existing_lead, field, value)
        
        existing_lead.updated_at = datetime.now(timezone.utc)
        existing_lead.ultima_interaccion = datetime.now(timezone.utc)
        
        await db.commit()
        await db.refresh(existing_lead)
        
        return LeadResponse.from_orm_model(existing_lead)
    
    # Crear nuevo lead
    new_lead = Lead(
        email=lead_data.email,
        telefono=lead_data.telefono,
        nombre_completo=lead_data.nombre_completo,
        empresa=lead_data.empresa,
        origen=lead_data.origen or 'api',
        utm_source=lead_data.utm_source,
        utm_campaign=lead_data.utm_campaign,
        estado='nuevo',
        score_total=0,
        ultima_interaccion=datetime.now(timezone.utc)
    )
    
    db.add(new_lead)
    await db.commit()
    await db.refresh(new_lead)
    
    return LeadResponse.from_orm_model(new_lead)


# ============= LISTAR LEADS =============
@router.get("/", response_model=List[LeadResponse])
async def listar_leads(
    estado: Optional[str] = Query(None, description="Filtrar por estado: nuevo, calificando, calificado, vendido, descartado"),
    origen: Optional[str] = Query(None, description="Filtrar por origen: web_chat, whatsapp, api"),
    score_minimo: Optional[int] = Query(None, ge=0, le=100, description="Score mínimo"),
    limit: int = Query(50, ge=1, le=200, description="Cantidad máxima de resultados"),
    offset: int = Query(0, ge=0, description="Offset para paginación"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Listar leads con filtros opcionales
    Requiere autenticación
    """
    query = select(Lead)
    
    # Aplicar filtros
    conditions = []
    
    if estado:
        conditions.append(Lead.estado == estado)
    
    if origen:
        conditions.append(Lead.origen == origen)
    
    if score_minimo is not None:
        conditions.append(Lead.score_total >= score_minimo)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    # Ordenar por última interacción
    query = query.order_by(desc(Lead.ultima_interaccion)).limit(limit).offset(offset)
    
    result = await db.execute(query)
    leads = result.scalars().all()
    
    return [LeadResponse.from_orm_model(lead) for lead in leads]


# ============= OBTENER LEAD POR ID =============
@router.get("/{lead_id}", response_model=LeadResponse)
async def obtener_lead(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Obtener detalle de un lead específico
    """
    try:
        lead_uuid = UUID(lead_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID de lead inválido"
        )
    
    result = await db.execute(
        select(Lead).where(Lead.id == lead_uuid)
    )
    lead = result.scalar_one_or_none()
    
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead no encontrado"
        )
    
    return LeadResponse.from_orm_model(lead)


# ============= ACTUALIZAR LEAD =============
@router.patch("/{lead_id}", response_model=LeadResponse)
async def actualizar_lead(
    lead_id: str,
    lead_update: LeadUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Actualizar información de un lead
    """
    try:
        lead_uuid = UUID(lead_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID de lead inválido"
        )
    
    result = await db.execute(
        select(Lead).where(Lead.id == lead_uuid)
    )
    lead = result.scalar_one_or_none()
    
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead no encontrado"
        )
    
    # Actualizar solo los campos proporcionados
    update_data = lead_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lead, field, value)
    
    lead.updated_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(lead)
    
    return LeadResponse.from_orm_model(lead)


# ============= ESTADÍSTICAS DE LEADS =============
@router.get("/stats/resumen")
async def estadisticas_leads(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Obtener estadísticas generales de leads
    """
    # Conteo por estado
    result = await db.execute(
        select(
            Lead.estado,
            func.count(Lead.id).label('cantidad')
        ).group_by(Lead.estado)
    )
    
    por_estado = {row.estado: row.cantidad for row in result}
    
    # Conteo por origen
    result_origen = await db.execute(
        select(
            Lead.origen,
            func.count(Lead.id).label('cantidad')
        ).group_by(Lead.origen)
    )
    
    por_origen = {row.origen: row.cantidad for row in result_origen}
    
    # Score promedio
    result_score = await db.execute(
        select(func.avg(Lead.score_total))
    )
    score_promedio = result_score.scalar() or 0
    
    # Total de leads
    result_total = await db.execute(
        select(func.count(Lead.id))
    )
    total_leads = result_total.scalar()
    
    # Leads de alta prioridad (score >= 70)
    result_alta_prioridad = await db.execute(
        select(func.count(Lead.id)).where(Lead.score_total >= 70)
    )
    alta_prioridad = result_alta_prioridad.scalar()
    
    return {
        "total_leads": total_leads,
        "por_estado": por_estado,
        "por_origen": por_origen,
        "score_promedio": round(float(score_promedio), 2),
        "alta_prioridad": alta_prioridad,
        "tasa_conversion": round(
            (por_estado.get('vendido', 0) / total_leads * 100) if total_leads > 0 else 0, 
            2
        )
    }


# ============= HISTORIAL DE CONVERSACIÓN DEL LEAD =============
@router.get("/{lead_id}/conversaciones")
async def obtener_conversaciones_lead(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Obtener todas las conversaciones de un lead con sus mensajes
    """
    try:
        lead_uuid = UUID(lead_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID de lead inválido"
        )
    
    # Verificar que el lead existe
    result = await db.execute(
        select(Lead).where(Lead.id == lead_uuid)
    )
    lead = result.scalar_one_or_none()
    
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead no encontrado"
        )
    
    # Obtener conversaciones
    result_conv = await db.execute(
        select(Conversacion)
        .where(Conversacion.lead_id == lead_uuid)
        .order_by(desc(Conversacion.inicio_sesion))
    )
    conversaciones = result_conv.scalars().all()
    
    conversaciones_data = []
    
    for conv in conversaciones:
        # Obtener mensajes de cada conversación
        result_msgs = await db.execute(
            select(Mensaje)
            .where(Mensaje.conversacion_id == conv.id)
            .order_by(Mensaje.created_at.asc())
        )
        mensajes = result_msgs.scalars().all()
        
        conversaciones_data.append({
            "id": str(conv.id),
            "session_id": conv.session_id,
            "canal": conv.canal,
            "estado": conv.estado,
            "probabilidad_compra": conv.probabilidad_compra,
            "inicio": conv.inicio_sesion.isoformat() if conv.inicio_sesion else None,
            "fin": conv.fin_sesion.isoformat() if conv.fin_sesion else None,
            "total_mensajes": conv.total_mensajes,
            "senales_interes": conv.senales_interes,
            "senales_rechazo": conv.senales_rechazo,
            "mensajes": [
                {
                    "id": str(msg.id),
                    "rol": msg.rol,
                    "contenido": msg.contenido,
                    "created_at": msg.created_at.isoformat(),
                    "intenciones": msg.intenciones
                }
                for msg in mensajes
            ]
        })
    
    return {
        "lead_id": str(lead_id),
        "lead_info": {
            "nombre": lead.nombre_completo,
            "email": lead.email,
            "empresa": lead.empresa,
            "estado": lead.estado,
            "score": lead.score_total
        },
        "total_conversaciones": len(conversaciones_data),
        "conversaciones": conversaciones_data
    }


# ============= ELIMINAR LEAD (SOFT DELETE) =============
@router.delete("/{lead_id}")
async def eliminar_lead(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Marcar lead como descartado (soft delete)
    Solo administradores pueden eliminar permanentemente
    """
    try:
        lead_uuid = UUID(lead_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID de lead inválido"
        )
    
    result = await db.execute(
        select(Lead).where(Lead.id == lead_uuid)
    )
    lead = result.scalar_one_or_none()
    
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead no encontrado"
        )
    
    # Soft delete: cambiar estado a descartado
    lead.estado = 'descartado'
    lead.updated_at = datetime.now(timezone.utc)
    
    await db.commit()
    
    return {
        "message": "Lead marcado como descartado exitosamente",
        "lead_id": str(lead_id)
    }


# ============= BUSCAR LEADS =============
@router.get("/search/query")
async def buscar_leads(
    q: str = Query(..., min_length=2, description="Término de búsqueda"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Buscar leads por nombre, email, empresa o teléfono
    """
    search_term = f"%{q}%"
    
    result = await db.execute(
        select(Lead).where(
            (Lead.nombre_completo.ilike(search_term)) |
            (Lead.email.ilike(search_term)) |
            (Lead.empresa.ilike(search_term)) |
            (Lead.telefono.ilike(search_term))
        ).limit(20)
    )
    
    leads = result.scalars().all()
    
    return {
        "query": q,
        "total_resultados": len(leads),
        "leads": [LeadResponse.from_orm_model(lead) for lead in leads]
    }

async def generar_embeddings_conocimiento():
    """
    Genera embeddings para todo el conocimiento existente
    """
    print("🔄 Generando embeddings para conocimiento...")
    
    async with AsyncSessionLocal() as db:
        # Obtener todo el conocimiento sin embedding
        result = await db.execute(
            select(ConocimientoRAG).where(
                ConocimientoRAG.activo == True
            )
        )
        conocimientos = result.scalars().all()
        
        if not conocimientos:
            print("⚠️  No hay conocimiento en la base de datos")
            return
        
        count = 0
        for item in conocimientos:
            # Combinar título y contenido para embedding
            texto_completo = f"{item.titulo}\n{item.contenido}"
            
            # Generar embedding
            embedding = embedding_service.encode_single(texto_completo)
            
            # Actualizar en BD
            await db.execute(
                text("""
                    UPDATE conocimiento_rag 
                    SET embedding = CAST(:embedding AS vector)
                    WHERE id = :item_id
                """),
                {
                    "embedding": str(embedding),
                    "item_id": str(item.id)
                }
            )
            
            count += 1
            print(f"  ✓ Embedding generado para: {item.titulo}")
        
        await db.commit()
        print(f"✅ {count} embeddings generados exitosamente\n")


async def generar_embeddings_productos():
    """
    Genera embeddings para productos (para búsqueda semántica)
    """
    print("🔄 Generando embeddings para productos...")
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Producto).where(Producto.activo == True)
        )
        productos = result.scalars().all()
        
        count = 0
        for producto in productos:
            # Combinar toda la info del producto
            texto_producto = f"""
            {producto.nombre}
            {producto.descripcion_corta}
            Sectores: {', '.join(producto.sectores or [])}
            Características: {', '.join(producto.features or [])}
            """
            
            embedding = embedding_service.encode_single(texto_producto)
            
            # Insertar en contexto_embeddings
            await db.execute(
                text("""
                    INSERT INTO contexto_embeddings (tipo, ref_id, embedding, snapshot)
                    VALUES ('producto', :ref_id, CAST(:embedding AS vector), :snapshot::jsonb)
                    ON CONFLICT (ref_id) WHERE tipo = 'producto'
                    DO UPDATE SET 
                        embedding = CAST(:embedding AS vector),
                        snapshot = :snapshot::jsonb,
                        updated_at = CURRENT_TIMESTAMP
                """),
                {
                    "ref_id": str(producto.id),
                    "embedding": str(embedding),
                    "snapshot": f'{{"nombre": "{producto.nombre}", "slug": "{producto.slug}"}}'
                }
            )
            
            count += 1
            print(f"  ✓ Embedding generado para: {producto.nombre}")
        
        await db.commit()
        print(f"✅ {count} embeddings de productos generados\n")


async def verificar_datos():
    """
    Verifica que todos los datos necesarios estén en la BD
    """
    print("🔍 Verificando datos...")
    
    async with AsyncSessionLocal() as db:
        # Verificar usuarios
        result = await db.execute(text("SELECT COUNT(*) FROM usuarios"))
        count_usuarios = result.scalar()
        print(f"  👤 Usuarios: {count_usuarios}")
        
        # Verificar productos
        result = await db.execute(text("SELECT COUNT(*) FROM productos WHERE activo = TRUE"))
        count_productos = result.scalar()
        print(f"  📦 Productos activos: {count_productos}")
        
        # Verificar conocimiento
        result = await db.execute(text("SELECT COUNT(*) FROM conocimiento_rag WHERE activo = TRUE"))
        count_conocimiento = result.scalar()
        print(f"  📚 Conocimiento RAG: {count_conocimiento}")
        
        # Verificar paquetes
        result = await db.execute(text("SELECT COUNT(*) FROM paquetes WHERE activo = TRUE"))
        count_paquetes = result.scalar()
        print(f"  🎁 Paquetes: {count_paquetes}")
        
        if count_productos == 0 or count_conocimiento == 0:
            print("\n⚠️  ADVERTENCIA: Faltan datos. Ejecuta el script SQL de inicialización primero.")
            return False
        
        print("\n✅ Todos los datos necesarios están presentes\n")
        return True


async def main():
    """
    Función principal
    """
    print("=" * 60)
    print("  INICIALIZACIÓN DE SISTEMA CRM MULTIAGENTE")
    print("=" * 60)
    print()
    
    # Verificar datos
    if not await verificar_datos():
        print("❌ Primero ejecuta el script SQL de inicialización")
        return
    
    # Generar embeddings
    await generar_embeddings_conocimiento()
    await generar_embeddings_productos()
    
    print("=" * 60)
    print("✅ INICIALIZACIÓN COMPLETADA")
    print("=" * 60)
    print()
    print("Ahora puedes iniciar el servidor:")
    print("  python -m uvicorn app.main:app --reload")
    print()


if __name__ == "__main__":
    asyncio.run(main())