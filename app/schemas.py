"""
app/schemas.py
Schemas Pydantic para validación y serialización
"""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from decimal import Decimal

# ============= CHAT =============
class ChatMessage(BaseModel):
    role: str = Field(..., description="user, assistant, o system")
    content: str
    timestamp: Optional[datetime] = None


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    session_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    lead_id: Optional[str] = None  # String para evitar problemas de serialización
    probabilidad_compra: int = 0
    producto_recomendado: Optional[str] = None
    necesita_vendedor: bool = False
    metadata: Optional[Dict[str, Any]] = None

# ============= LEAD =============
class LeadBase(BaseModel):
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    nombre_completo: Optional[str] = None
    empresa: Optional[str] = None
    origen: str = 'web_chat'
    utm_source: Optional[str] = None
    utm_campaign: Optional[str] = None

class LeadCreate(LeadBase):
    pass

class LeadUpdate(BaseModel):
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    nombre_completo: Optional[str] = None
    empresa: Optional[str] = None
    presupuesto_declarado: Optional[Decimal] = None
    es_decisor: Optional[bool] = None
    problema_principal: Optional[str] = None
    urgencia_dias: Optional[int] = None
    estado: Optional[str] = None

class LeadResponse(LeadBase):
    id: str  # UUID como string
    score_total: int
    estado: str
    presupuesto_declarado: Optional[Decimal] = None
    es_decisor: Optional[bool] = None
    problema_principal: Optional[str] = None
    urgencia_dias: Optional[int] = None
    vendedor_asignado_id: Optional[str] = None  # UUID como string
    created_at: datetime
    updated_at: datetime
    ultima_interaccion: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)
    
    @classmethod
    def from_orm_model(cls, lead):
        """Convierte modelo ORM a Pydantic con UUIDs como strings"""
        return cls(
            id=str(lead.id),
            email=lead.email,
            telefono=lead.telefono,
            nombre_completo=lead.nombre_completo,
            empresa=lead.empresa,
            origen=lead.origen,
            utm_source=lead.utm_source,
            utm_campaign=lead.utm_campaign,
            score_total=lead.score_total,
            estado=lead.estado,
            presupuesto_declarado=lead.presupuesto_declarado,
            es_decisor=lead.es_decisor,
            problema_principal=lead.problema_principal,
            urgencia_dias=lead.urgencia_dias,
            vendedor_asignado_id=str(lead.vendedor_asignado_id) if lead.vendedor_asignado_id else None,
            created_at=lead.created_at,
            updated_at=lead.updated_at,
            ultima_interaccion=lead.ultima_interaccion
        )

# ============= CONVERSACION =============
class ConversacionBase(BaseModel):
    canal: str
    session_id: str

class ConversacionResponse(ConversacionBase):
    id: str  # UUID como string
    lead_id: str  # UUID como string
    estado: str
    probabilidad_compra: int
    senales_interes: List[Dict[str, Any]]
    senales_rechazo: List[Dict[str, Any]]
    producto_recomendado_id: Optional[str] = None  # UUID como string
    paquete_recomendado_id: Optional[str] = None  # UUID como string
    inicio_sesion: datetime
    fin_sesion: Optional[datetime] = None
    total_mensajes: int
    
    model_config = ConfigDict(from_attributes=True)

# ============= MENSAJE =============
class MensajeCreate(BaseModel):
    conversacion_id: str  # UUID como string
    lead_id: str  # UUID como string
    rol: str
    contenido: str
    intenciones: Optional[Dict[str, Any]] = None
    entidades: Optional[Dict[str, Any]] = None

class MensajeResponse(BaseModel):
    id: str  # UUID como string
    conversacion_id: str  # UUID como string
    lead_id: str  # UUID como string
    rol: str
    contenido: str
    intenciones: Optional[Dict[str, Any]] = None
    entidades: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# ============= PRODUCTO =============
class ProductoResponse(BaseModel):
    id: str  # UUID como string
    nombre: str
    slug: str
    descripcion_corta: str
    precio_base: Decimal
    sectores: List[str]
    features: List[str]
    activo: bool
    
    model_config = ConfigDict(from_attributes=True)

class PaqueteResponse(BaseModel):
    id: str  # UUID como string
    producto_id: str  # UUID como string
    nombre: str
    slug: str
    precio_mensual: Decimal
    precio_anual: Optional[Decimal] = None
    ideal_para: List[str]
    limites: Optional[Dict[str, Any]] = None
    destacado: bool
    activo: bool
    
    model_config = ConfigDict(from_attributes=True)

# ============= VENDEDOR =============
class VendedorLeadUpdate(BaseModel):
    estado: str = Field(..., description="vendido o descartado")
    objecion_principal: Optional[str] = None
    notas_vendedor: Optional[str] = None
    precio_cerrado: Optional[Decimal] = None
    producto_vendido_id: Optional[str] = None  # UUID como string
    paquete_vendido_id: Optional[str] = None  # UUID como string

class VendedorDashboard(BaseModel):
    total_leads: int
    leads_calificados: int
    leads_vendidos: int
    leads_descartados: int
    tasa_conversion: float
    leads_recientes: List[LeadResponse]

# ============= RAG =============
class ConocimientoRAGResponse(BaseModel):
    id: str  # UUID como string
    tipo: str
    titulo: str
    contenido: str
    metadata: Optional[Dict[str, Any]] = None
    similitud: Optional[float] = None
    
    model_config = ConfigDict(from_attributes=True)

# ============= ANALYTICS =============
class SenalInteres(BaseModel):
    tipo: str = Field(..., description="pregunta_precio, solicita_demo, menciona_presupuesto, etc")
    contenido: str
    timestamp: datetime
    peso: int = Field(..., ge=1, le=10)

class SenalRechazo(BaseModel):
    tipo: str = Field(..., description="muy_caro, no_necesito, etc")
    contenido: str
    timestamp: datetime
    peso: int = Field(..., ge=1, le=10)

class ActualizacionProbabilidad(BaseModel):
    probabilidad_anterior: int
    probabilidad_nueva: int
    senales_interes: List[SenalInteres]
    senales_rechazo: List[SenalRechazo]
    justificacion: str

# ============= AGENT STATE (para uso interno) =============
class AgentState(BaseModel):
    """Estado compartido entre agentes"""
    session_id: str
    lead_id: Optional[str] = None  # UUID como string
    conversacion_id: Optional[str] = None  # UUID como string
    mensaje_usuario: str
    historial: List[ChatMessage] = []
    
    # Información extraída
    nombre: Optional[str] = None
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    empresa: Optional[str] = None
    presupuesto: Optional[Decimal] = None
    urgencia_dias: Optional[int] = None
    problema_principal: Optional[str] = None
    es_decisor: Optional[bool] = None
    
    # Tracking
    probabilidad_compra: int = 0
    senales_interes: List[Dict[str, Any]] = []
    senales_rechazo: List[Dict[str, Any]] = []
    producto_recomendado: Optional[str] = None
    paquete_recomendado: Optional[str] = None
    
    # Control de flujo
    etapa: str = "inicio"
    necesita_vendedor: bool = False
    debe_finalizar: bool = False
    
    # Contexto RAG
    conocimiento_relevante: List[Dict[str, Any]] = []
    patrones_aplicados: List[Dict[str, Any]] = []
    
    model_config = ConfigDict(arbitrary_types_allowed=True)