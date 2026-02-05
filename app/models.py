from sqlalchemy import Column, String, Integer, Boolean, DECIMAL, Text, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY, TIMESTAMP
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from datetime import datetime, timezone
import uuid

from app.services.database import Base


def utcnow():
    """Devuelve datetime UTC timezone-aware (Python 3.12+)"""
    return datetime.now(timezone.utc)


class Usuario(Base):
    __tablename__ = "usuarios"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    nombre_completo = Column(String(255), nullable=False)
    rol = Column(String(50), nullable=False, default='vendedor')
    activo = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP(timezone=True), default=utcnow)
    
    leads_asignados = relationship("Lead", back_populates="vendedor_asignado")
    sesiones = relationship("Sesion", back_populates="usuario", cascade="all, delete-orphan")
    
    __table_args__ = (
        CheckConstraint("rol IN ('admin', 'vendedor', 'viewer')", name='check_rol'),
    )


class Lead(Base):
    __tablename__ = "leads"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255))
    telefono = Column(String(50))
    nombre_completo = Column(String(255))
    empresa = Column(String(255))
    origen = Column(String(50), nullable=False, default='web_chat')
    utm_source = Column(String(100))
    utm_campaign = Column(String(100))
    score_total = Column(Integer, default=0)
    estado = Column(String(50), nullable=False, default='nuevo')
    presupuesto_declarado = Column(DECIMAL(10, 2))
    es_decisor = Column(Boolean)
    problema_principal = Column(Text)
    urgencia_dias = Column(Integer)
    sector = Column(String(100))
    vendedor_asignado_id = Column(UUID(as_uuid=True), ForeignKey('usuarios.id'))
    created_at = Column(TIMESTAMP(timezone=True), default=utcnow)
    updated_at = Column(TIMESTAMP(timezone=True), default=utcnow, onupdate=utcnow)
    ultima_interaccion = Column(TIMESTAMP(timezone=True))
    pais = Column(String(2), default='PE')
    
    vendedor_asignado = relationship("Usuario", back_populates="leads_asignados")
    conversaciones = relationship("Conversacion", back_populates="lead", cascade="all, delete-orphan")
    mensajes = relationship("Mensaje", back_populates="lead", cascade="all, delete-orphan")
    
    __table_args__ = (
        CheckConstraint("origen IN ('web_chat', 'whatsapp', 'api')", name='check_origen'),
        CheckConstraint("estado IN ('nuevo', 'calificando', 'calificado', 'vendido', 'descartado')", name='check_estado'),
        CheckConstraint("score_total BETWEEN 0 AND 100", name='check_score'),
    )


class Producto(Base):
    __tablename__ = "productos"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(200), nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True)
    descripcion_corta = Column(Text, nullable=False)
    precio_base = Column(DECIMAL(10, 2), nullable=False)
    sectores = Column(ARRAY(Text))
    features = Column(ARRAY(Text))
    activo = Column(Boolean, default=True)
    
    paquetes = relationship("Paquete", back_populates="producto", cascade="all, delete-orphan")


class Paquete(Base):
    __tablename__ = "paquetes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    producto_id = Column(UUID(as_uuid=True), ForeignKey('productos.id', ondelete='CASCADE'), nullable=False)
    nombre = Column(String(100), nullable=False)
    slug = Column(String(100), nullable=False, unique=True)
    precio_mensual = Column(DECIMAL(10, 2), nullable=False)
    precio_anual = Column(DECIMAL(10, 2))
    ideal_para = Column(ARRAY(Text))
    limites = Column(JSONB)
    destacado = Column(Boolean, default=False)
    activo = Column(Boolean, default=True)
    
    producto = relationship("Producto", back_populates="paquetes")


class Conversacion(Base):
    __tablename__ = "conversaciones"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id = Column(UUID(as_uuid=True), ForeignKey('leads.id', ondelete='CASCADE'), nullable=False)
    session_id = Column(String(255), unique=True, nullable=False)
    canal = Column(String(50), nullable=False)
    estado = Column(String(50), default='activa')
    
    estado_agente = Column(JSONB, default={
        "current_stage": "inicio",
        "lead_profile": "explorador",
        "cooperatividad_score": 50,
        "data_capture_attempts": 0,
        "extracted_data": {},
        "agent_memory": {}
    })
    
    probabilidad_compra = Column(Integer, default=0)
    senales_interes = Column(JSONB, default=[])
    senales_rechazo = Column(JSONB, default=[])
    producto_recomendado_id = Column(UUID(as_uuid=True), ForeignKey('productos.id'))
    paquete_recomendado_id = Column(UUID(as_uuid=True), ForeignKey('paquetes.id'))
    
    email_notificacion_enviado = Column(Boolean, default=False)
    fecha_email_enviado = Column(TIMESTAMP(timezone=True))
    inicio_sesion = Column(TIMESTAMP(timezone=True), default=utcnow)
    fin_sesion = Column(TIMESTAMP(timezone=True))
    total_mensajes = Column(Integer, default=0)
    
    lead = relationship("Lead", back_populates="conversaciones")
    mensajes = relationship("Mensaje", back_populates="conversacion", cascade="all, delete-orphan")


class Mensaje(Base):
    __tablename__ = "mensajes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversacion_id = Column(UUID(as_uuid=True), ForeignKey('conversaciones.id', ondelete='CASCADE'), nullable=False)
    lead_id = Column(UUID(as_uuid=True), ForeignKey('leads.id', ondelete='CASCADE'), nullable=False)
    rol = Column(String(20), nullable=False)
    contenido = Column(Text, nullable=False)
    embedding = Column(Vector(384))
    intenciones = Column(JSONB)
    entidades = Column(JSONB)
    created_at = Column(TIMESTAMP(timezone=True), default=utcnow, index=True)
    
    conversacion = relationship("Conversacion", back_populates="mensajes")
    lead = relationship("Lead", back_populates="mensajes")
    
    __table_args__ = (
        CheckConstraint("rol IN ('user', 'assistant', 'system')", name='check_rol_msg'),
    )


class ConocimientoRAG(Base):
    __tablename__ = "conocimiento_rag"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tipo = Column(String(50), nullable=False, index=True)
    titulo = Column(String(300), nullable=False)
    contenido = Column(Text, nullable=False)
    metadatos = Column('metadata', JSONB)
    embedding = Column(Vector(384), nullable=False)
    activo = Column(Boolean, default=True, index=True)
    created_at = Column(TIMESTAMP(timezone=True), default=utcnow)
    
    __table_args__ = (
        CheckConstraint("tipo IN ('caso_exito', 'objecion', 'faq', 'regulacion', 'guia_producto')", name='check_tipo_rag'),
    )


class ConversacionEtiquetada(Base):
    __tablename__ = "conversaciones_etiquetadas"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversacion_id = Column(UUID(as_uuid=True), ForeignKey('conversaciones.id', ondelete='CASCADE'), unique=True, nullable=False)
    lead_id = Column(UUID(as_uuid=True), ForeignKey('leads.id'), nullable=False)
    resultado = Column(String(50), nullable=False)
    metodo_etiquetado = Column(String(50), nullable=False, default='manual')
    momento_critico = Column(Text)
    objecion_principal = Column(String(100), index=True)
    respuesta_agente_objecion = Column(Text)
    efectividad_respuesta = Column(Integer)
    producto_ofrecido = Column(UUID(as_uuid=True), ForeignKey('productos.id'))
    paquete_ofrecido = Column(UUID(as_uuid=True), ForeignKey('paquetes.id'))
    precio_mencionado = Column(DECIMAL(10, 2))
    patron_ganador = Column(Boolean, default=False, index=True)
    patron_perdedor = Column(Boolean, default=False)
    etiquetado_por_usuario_id = Column(UUID(as_uuid=True), ForeignKey('usuarios.id'))
    notas_vendedor = Column(Text)
    confianza_etiquetado = Column(Integer)
    created_at = Column(TIMESTAMP(timezone=True), default=utcnow)


class PatronAprendido(Base):
    __tablename__ = "patrones_aprendidos"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tipo_patron = Column(String(50), nullable=False, index=True)
    contexto = Column(Text, nullable=False)
    respuesta_agente = Column(Text, nullable=False)
    tasa_exito = Column(DECIMAL(5, 2))
    veces_usado = Column(Integer, default=0)
    veces_exitoso = Column(Integer, default=0)
    embedding_contexto = Column(Vector(384))
    conversaciones_origen = Column(ARRAY(UUID(as_uuid=True)))
    aprobado_para_uso = Column(Boolean, default=False, index=True)
    created_at = Column(TIMESTAMP(timezone=True), default=utcnow)
    updated_at = Column(TIMESTAMP(timezone=True), default=utcnow, onupdate=utcnow)


class Sesion(Base):
    __tablename__ = "sesiones"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey('usuarios.id', ondelete='CASCADE'), nullable=False)
    token_hash = Column(String(255), nullable=False, unique=True, index=True)
    expira_at = Column(TIMESTAMP(timezone=True), nullable=False)
    revocado = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP(timezone=True), default=utcnow)
    
    usuario = relationship("Usuario", back_populates="sesiones")