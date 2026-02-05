"""
app/api/vendedor.py
Endpoints para el flujo del vendedor humano (Paso 2)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, text
from uuid import UUID
from datetime import datetime, timezone
from typing import List, Optional

from app.services.database import get_db
from app.models import Lead, Conversacion, Usuario, ConversacionEtiquetada, Mensaje
from app.api.auth import get_current_active_user
from pydantic import BaseModel, Field
from decimal import Decimal


router = APIRouter()


# ============= SCHEMAS =============
class LeadAssignRequest(BaseModel):
    lead_id: str


class VentaCerradaRequest(BaseModel):
    resultado: str = Field(..., description="venta_ganada o venta_perdida")
    objecion_principal: Optional[str] = None
    notas_vendedor: Optional[str] = None
    precio_cerrado: Optional[Decimal] = None
    producto_vendido_id: Optional[str] = None
    paquete_vendido_id: Optional[str] = None
    momento_critico: Optional[str] = None
    efectividad_respuesta: Optional[int] = Field(None, ge=1, le=10)


class LeadDetalleResponse(BaseModel):
    lead: dict
    conversacion: dict
    mensajes: List[dict]
    estadisticas: dict


class DashboardResponse(BaseModel):
    total_leads: int
    leads_nuevos: int
    leads_en_calificacion: int
    leads_calificados: int
    leads_vendidos: int
    leads_descartados: int
    tasa_conversion: float
    leads_alta_probabilidad: List[dict]
    leads_asignados_hoy: List[dict]
    actividad_reciente: List[dict]


# ============= DASHBOARD DEL VENDEDOR =============
@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Dashboard principal del vendedor con métricas y leads prioritarios
    """
    # Totales generales
    result = await db.execute(
        select(
            func.count(Lead.id).label('total'),
            func.count(Lead.id).filter(Lead.estado == 'nuevo').label('nuevos'),
            func.count(Lead.id).filter(Lead.estado == 'calificando').label('calificando'),
            func.count(Lead.id).filter(Lead.estado == 'calificado').label('calificados'),
            func.count(Lead.id).filter(Lead.estado == 'vendido').label('vendidos'),
            func.count(Lead.id).filter(Lead.estado == 'descartado').label('descartados')
        )
    )
    
    stats = result.one()
    
    # Tasa de conversión
    tasa_conversion = 0.0
    if stats.calificados + stats.vendidos > 0:
        tasa_conversion = round((stats.vendidos / (stats.calificados + stats.vendidos)) * 100, 2)
    
    # Leads de alta probabilidad (>= 60%)
    result_alta_prob = await db.execute(
        select(Lead, Conversacion)
        .join(Conversacion, Lead.id == Conversacion.lead_id)
        .where(
            Conversacion.probabilidad_compra >= 60,
            Lead.estado.in_(['nuevo', 'calificando', 'calificado']),
            Conversacion.estado == 'finalizada'
        )
        .order_by(Conversacion.probabilidad_compra.desc())
        .limit(10)
    )
    
    leads_alta_prob = []
    for lead, conv in result_alta_prob:
        leads_alta_prob.append({
            "id": str(lead.id),
            "nombre": lead.nombre_completo or "Sin nombre",
            "email": lead.email,
            "empresa": lead.empresa,
            "probabilidad": conv.probabilidad_compra,
            "ultima_interaccion": lead.ultima_interaccion.isoformat() if lead.ultima_interaccion else None,
            "sector": lead.extracted_data.get("sector") if hasattr(lead, 'extracted_data') else None
        })
    
    # Leads asignados hoy
    hoy = datetime.now(timezone.utc).date()
    result_hoy = await db.execute(
        select(Lead)
        .where(
            Lead.vendedor_asignado_id == current_user.id,
            func.date(Lead.updated_at) == hoy
        )
        .order_by(Lead.updated_at.desc())
        .limit(10)
    )
    
    leads_hoy = []
    for lead in result_hoy.scalars():
        leads_hoy.append({
            "id": str(lead.id),
            "nombre": lead.nombre_completo or "Sin nombre",
            "email": lead.email,
            "estado": lead.estado,
            "score": lead.score_total
        })
    
    # Actividad reciente (últimas conversaciones finalizadas)
    result_actividad = await db.execute(
        select(Conversacion, Lead)
        .join(Lead, Conversacion.lead_id == Lead.id)
        .where(Conversacion.estado == 'finalizada')
        .order_by(Conversacion.fin_sesion.desc())
        .limit(15)
    )
    
    actividad = []
    for conv, lead in result_actividad:
        actividad.append({
            "conversacion_id": str(conv.id),
            "lead_nombre": lead.nombre_completo or "Sin nombre",
            "probabilidad": conv.probabilidad_compra,
            "total_mensajes": conv.total_mensajes,
            "fin_sesion": conv.fin_sesion.isoformat() if conv.fin_sesion else None,
            "email_enviado": conv.email_notificacion_enviado
        })
    
    return DashboardResponse(
        total_leads=stats.total,
        leads_nuevos=stats.nuevos,
        leads_en_calificacion=stats.calificando,
        leads_calificados=stats.calificados,
        leads_vendidos=stats.vendidos,
        leads_descartados=stats.descartados,
        tasa_conversion=tasa_conversion,
        leads_alta_probabilidad=leads_alta_prob,
        leads_asignados_hoy=leads_hoy,
        actividad_reciente=actividad
    )


# ============= ASIGNAR LEAD =============
@router.post("/leads/{lead_id}/asignar")
async def asignar_lead(
    lead_id: str,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    El vendedor se asigna un lead
    """
    try:
        lead_uuid = UUID(lead_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de lead inválido")
    
    result = await db.execute(
        select(Lead).where(Lead.id == lead_uuid)
    )
    lead = result.scalar_one_or_none()
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    
    if lead.vendedor_asignado_id and lead.vendedor_asignado_id != current_user.id:
        raise HTTPException(status_code=400, detail="Lead ya asignado a otro vendedor")
    

    await db.execute(
        update(Lead)
        .where(Lead.id == lead_uuid)
        .values(
            vendedor_asignado_id=current_user.id,
            estado='calificando' if lead.estado == 'nuevo' else lead.estado,
            updated_at=datetime.now(timezone.utc)
        )
    )
    await db.commit()
    
    return {
        "message": "Lead asignado exitosamente",
        "lead_id": str(lead_id),
        "vendedor": current_user.nombre_completo
    }


# ============= VER DETALLE DEL LEAD =============
@router.get("/leads/{lead_id}", response_model=LeadDetalleResponse)
async def get_lead_detalle(
    lead_id: str,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene detalle completo de un lead con su conversación y mensajes
    """
    try:
        lead_uuid = UUID(lead_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID inválido")
    
    # Lead
    result = await db.execute(
        select(Lead).where(Lead.id == lead_uuid)
    )
    lead = result.scalar_one_or_none()
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    
    # Conversación
    result_conv = await db.execute(
        select(Conversacion)
        .where(Conversacion.lead_id == lead_uuid)
        .order_by(Conversacion.inicio_sesion.desc())
        .limit(1)
    )
    conversacion = result_conv.scalar_one_or_none()
    
    # Mensajes
    mensajes = []
    if conversacion:
        result_msgs = await db.execute(
            select(Mensaje)
            .where(Mensaje.conversacion_id == conversacion.id)
            .order_by(Mensaje.created_at.asc())
        )
        
        for msg in result_msgs.scalars():
            mensajes.append({
                "id": str(msg.id),
                "rol": msg.rol,
                "contenido": msg.contenido,
                "intenciones": msg.intenciones,
                "created_at": msg.created_at.isoformat()
            })
    
    # Estadísticas
    estadisticas = {
        "score_total": lead.score_total,
        "probabilidad_compra": conversacion.probabilidad_compra if conversacion else 0,
        "total_mensajes": conversacion.total_mensajes if conversacion else 0,
        "senales_interes": len(conversacion.senales_interes) if conversacion and conversacion.senales_interes else 0,
        "senales_rechazo": len(conversacion.senales_rechazo) if conversacion and conversacion.senales_rechazo else 0,
        "duracion_conversacion": None
    }
    
    if conversacion and conversacion.inicio_sesion and conversacion.fin_sesion:
        duracion = conversacion.fin_sesion - conversacion.inicio_sesion
        estadisticas["duracion_conversacion"] = str(duracion)
    
    return LeadDetalleResponse(
        lead={
            "id": str(lead.id),
            "nombre_completo": lead.nombre_completo,
            "email": lead.email,
            "telefono": lead.telefono,
            "empresa": lead.empresa,
            "estado": lead.estado,
            "presupuesto_declarado": float(lead.presupuesto_declarado) if lead.presupuesto_declarado else None,
            "es_decisor": lead.es_decisor,
            "problema_principal": lead.problema_principal,
            "urgencia_dias": lead.urgencia_dias,
            "created_at": lead.created_at.isoformat(),
            "ultima_interaccion": lead.ultima_interaccion.isoformat() if lead.ultima_interaccion else None
        },
        conversacion={
            "id": str(conversacion.id) if conversacion else None,
            "canal": conversacion.canal if conversacion else None,
            "estado": conversacion.estado if conversacion else None,
            "probabilidad_compra": conversacion.probabilidad_compra if conversacion else 0,
            "contexto": conversacion.contexto if conversacion else {},
            "senales_interes": conversacion.senales_interes if conversacion else [],
            "senales_rechazo": conversacion.senales_rechazo if conversacion else []
        } if conversacion else {},
        mensajes=mensajes,
        estadisticas=estadisticas
    )


# ============= CERRAR VENTA =============
@router.post("/leads/{lead_id}/cerrar")
async def cerrar_venta(
    lead_id: str,
    cierre: VentaCerradaRequest,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    El vendedor marca el resultado final de su gestión del lead
    Esto alimenta el aprendizaje del sistema
    """
    try:
        lead_uuid = UUID(lead_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID inválido")
    
    # Validar resultado
    if cierre.resultado not in ['venta_ganada', 'venta_perdida']:
        raise HTTPException(status_code=400, detail="Resultado debe ser 'venta_ganada' o 'venta_perdida'")
    
    # Obtener lead y conversación
    result = await db.execute(
        select(Lead).where(Lead.id == lead_uuid)
    )
    lead = result.scalar_one_or_none()
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    
    result_conv = await db.execute(
        select(Conversacion)
        .where(Conversacion.lead_id == lead_uuid)
        .order_by(Conversacion.inicio_sesion.desc())
        .limit(1)
    )
    conversacion = result_conv.scalar_one_or_none()
    
    if not conversacion:
        raise HTTPException(status_code=404, detail="No hay conversación asociada")
    
    # Actualizar estado del lead
    nuevo_estado = 'vendido' if cierre.resultado == 'venta_ganada' else 'descartado'
    
    await db.execute(
        update(Lead)
        .where(Lead.id == lead_uuid)
        .values(
            estado=nuevo_estado,
            updated_at=datetime.now(timezone.utc)
        )
    )
    
    # Crear etiquetado para aprendizaje
    etiquetado = ConversacionEtiquetada(
        conversacion_id=conversacion.id,
        lead_id=lead_uuid,
        resultado=cierre.resultado,
        metodo_etiquetado='manual',
        momento_critico=cierre.momento_critico,
        objecion_principal=cierre.objecion_principal,
        efectividad_respuesta=cierre.efectividad_respuesta,
        producto_ofrecido=UUID(cierre.producto_vendido_id) if cierre.producto_vendido_id else None,
        paquete_ofrecido=UUID(cierre.paquete_vendido_id) if cierre.paquete_vendido_id else None,
        precio_mencionado=cierre.precio_cerrado,
        patron_ganador=(cierre.resultado == 'venta_ganada'),
        patron_perdedor=(cierre.resultado == 'venta_perdida'),
        etiquetado_por_usuario_id=current_user.id,
        notas_vendedor=cierre.notas_vendedor,
        confianza_etiquetado=100  # Manual = 100%
    )
    
    db.add(etiquetado)
    
    # Si fue venta ganada y hay objeción manejada, crear patrón aprobado
    if cierre.resultado == 'venta_ganada' and cierre.objecion_principal and cierre.momento_critico:
        from app.services.embeddings import embedding_service
        
        contexto_emb = embedding_service.encode_single(cierre.objecion_principal)
        
        await db.execute(
            text("""
                INSERT INTO patrones_aprendidos 
                (tipo_patron, contexto, respuesta_agente, embedding_contexto, 
                 veces_exitoso, veces_usado, tasa_exito, aprobado_para_uso, conversaciones_origen)
                VALUES 
                (:tipo, :contexto, :respuesta, CAST(:embedding AS vector), 
                 1, 1, 100.0, TRUE, ARRAY[:conv_id]::uuid[])
            """),
            {
                "tipo": "objecion_exitosa",
                "contexto": cierre.objecion_principal,
                "respuesta": cierre.momento_critico,
                "embedding": str(contexto_emb),
                "conv_id": str(conversacion.id)
            }
        )
    
    await db.commit()
    
    return {
        "message": "Venta cerrada y registrada exitosamente",
        "lead_id": str(lead_id),
        "resultado": cierre.resultado,
        "estado_lead": nuevo_estado,
        "aprendizaje_creado": (cierre.resultado == 'venta_ganada' and cierre.objecion_principal is not None)
    }


# ============= LISTAR LEADS ASIGNADOS =============
@router.get("/mis-leads")
async def get_mis_leads(
    estado: Optional[str] = None,
    limit: int = 50,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lista todos los leads asignados al vendedor actual
    """
    query = select(Lead).where(Lead.vendedor_asignado_id == current_user.id)
    
    if estado:
        query = query.where(Lead.estado == estado)
    
    query = query.order_by(Lead.ultima_interaccion.desc()).limit(limit)
    
    result = await db.execute(query)
    leads = result.scalars().all()
    
    return {
        "total": len(leads),
        "leads": [
            {
                "id": str(lead.id),
                "nombre": lead.nombre_completo or "Sin nombre",
                "email": lead.email,
                "empresa": lead.empresa,
                "estado": lead.estado,
                "score": lead.score_total,
                "presupuesto": float(lead.presupuesto_declarado) if lead.presupuesto_declarado else None,
                "ultima_interaccion": lead.ultima_interaccion.isoformat() if lead.ultima_interaccion else None
            }
            for lead in leads
        ]
    }


# conversaciones completas
@router.get("/leads/{lead_id}/conversacion")
async def get_conversacion_completa(
    lead_id: str,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene todas las conversaciones y mensajes de un lead
    """
    try:
        lead_uuid = UUID(lead_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID inválido")
    
    # Verificar que el lead existe
    result = await db.execute(
        select(Lead).where(Lead.id == lead_uuid)
    )
    lead = result.scalar_one_or_none()
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    
    # Obtener todas las conversaciones del lead
    result_convs = await db.execute(
        select(Conversacion)
        .where(Conversacion.lead_id == lead_uuid)
        .order_by(Conversacion.inicio_sesion.desc())
    )
    conversaciones = result_convs.scalars().all()
    
    if not conversaciones:
        return {
            "lead_id": str(lead_id),
            "lead_nombre": lead.nombre_completo,
            "conversaciones": []
        }
    
    # Para cada conversación, obtener sus mensajes
    conversaciones_data = []
    
    for conv in conversaciones:
        # Obtener mensajes de esta conversación
        result_msgs = await db.execute(
            select(Mensaje)
            .where(Mensaje.conversacion_id == conv.id)
            .order_by(Mensaje.created_at.asc())
        )
        mensajes = result_msgs.scalars().all()
        
        conversaciones_data.append({
            "id": str(conv.id),
            "canal": conv.canal,
            "inicio": conv.inicio_sesion.isoformat() if conv.inicio_sesion else None,
            "fin": conv.fin_sesion.isoformat() if conv.fin_sesion else None,
            "probabilidad_compra": conv.probabilidad_compra,
            "estado": conv.estado,
            "total_mensajes": conv.total_mensajes,
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
        "lead_nombre": lead.nombre_completo or "Sin nombre",
        "lead_email": lead.email,
        "lead_empresa": lead.empresa,
        "conversaciones": conversaciones_data
    }

# ============= ESTADÍSTICAS DE VENDEDOR =============
@router.get("/estadisticas")
async def get_estadisticas_vendedor(
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Estadísticas detalladas del vendedor: conversión, velocidad, efectividad
    """
    # Conversiones totales
    result = await db.execute(
        select(
            func.count(Lead.id).label('total'),
            func.count(Lead.id).filter(Lead.estado == 'vendido').label('vendidos'),
            func.count(Lead.id).filter(Lead.estado == 'descartado').label('descartados')
        )
        .where(Lead.vendedor_asignado_id == current_user.id)
    )
    
    stats = result.one()
    
    tasa_conversion = 0.0
    if stats.total > 0:
        tasa_conversion = round((stats.vendidos / stats.total) * 100, 2)
    
    # Tiempo promedio de cierre
    result_tiempo = await db.execute(
        text("""
            SELECT AVG(EXTRACT(EPOCH FROM (l.updated_at - c.inicio_sesion)) / 3600) as horas_promedio
            FROM leads l
            JOIN conversaciones c ON c.lead_id = l.id
            WHERE l.vendedor_asignado_id = :vendedor_id
                AND l.estado IN ('vendido', 'descartado')
        """),
        {"vendedor_id": current_user.id}
    )
    
    tiempo_prom = result_tiempo.scalar()
    
    # Objeciones más comunes
    result_objeciones = await db.execute(
        text("""
            SELECT objecion_principal, COUNT(*) as frecuencia
            FROM conversaciones_etiquetadas
            WHERE etiquetado_por_usuario_id = :vendedor_id
                AND objecion_principal IS NOT NULL
            GROUP BY objecion_principal
            ORDER BY frecuencia DESC
            LIMIT 5
        """),
        {"vendedor_id": current_user.id}
    )
    
    objeciones = [
        {"objecion": row[0], "frecuencia": row[1]}
        for row in result_objeciones
    ]
    
    return {
        "total_leads": stats.total,
        "vendidos": stats.vendidos,
        "descartados": stats.descartados,
        "tasa_conversion": tasa_conversion,
        "tiempo_promedio_cierre_horas": round(tiempo_prom, 2) if tiempo_prom else None,
        "objeciones_frecuentes": objeciones
    }