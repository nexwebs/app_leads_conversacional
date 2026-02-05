CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
SET CLIENT_ENCODING TO 'UTF8';


CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL DEFAULT 'vendedor' CHECK (rol IN ('admin', 'vendedor', 'viewer')),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usuarios_email ON usuarios(email);

CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255),
    telefono VARCHAR(50),
    nombre_completo VARCHAR(255),
    empresa VARCHAR(255),
    origen VARCHAR(50) NOT NULL DEFAULT 'web_chat' CHECK (origen IN ('web_chat', 'whatsapp', 'api')),
    utm_source VARCHAR(100),
    utm_campaign VARCHAR(100),
    score_total INTEGER DEFAULT 0 CHECK (score_total BETWEEN 0 AND 100),
    estado VARCHAR(50) NOT NULL DEFAULT 'nuevo' CHECK (estado IN ('nuevo', 'calificando', 'calificado', 'vendido', 'descartado')),
    presupuesto_declarado DECIMAL(10,2),
    es_decisor BOOLEAN,
    problema_principal TEXT,
    urgencia_dias INTEGER,
    sector VARCHAR(100),
    vendedor_asignado_id UUID REFERENCES usuarios(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ultima_interaccion TIMESTAMP WITH TIME ZONE,
    pais VARCHAR(2) DEFAULT 'PE'
);

CREATE INDEX idx_leads_estado ON leads(estado);
CREATE INDEX idx_leads_score ON leads(score_total DESC);
CREATE INDEX idx_leads_ultima_int ON leads(ultima_interaccion DESC);
CREATE INDEX idx_leads_email ON leads(email) WHERE email IS NOT NULL;

CREATE TABLE productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(200) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    descripcion_corta TEXT NOT NULL,
    precio_base DECIMAL(10,2) NOT NULL,
    sectores TEXT[],
    features TEXT[],
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE paquetes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    precio_mensual DECIMAL(10,2) NOT NULL,
    precio_anual DECIMAL(10,2),
    ideal_para TEXT[],
    limites JSONB,
    destacado BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    UNIQUE(producto_id, nombre)
);

CREATE INDEX idx_paq_producto ON paquetes(producto_id);

CREATE TABLE conversaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    canal VARCHAR(50) NOT NULL,
    estado VARCHAR(50) DEFAULT 'activa' CHECK (estado IN ('activa', 'finalizada', 'abandonada')),
    
    estado_agente JSONB DEFAULT '{
        "current_stage": "inicio",
        "lead_profile": "explorador",
        "cooperatividad_score": 50,
        "data_capture_attempts": 0,
        "needs_profiling": true,
        "ready_for_data_capture": false,
        "extracted_data": {},
        "agent_memory": {}
    }'::jsonb,
    
    probabilidad_compra INTEGER DEFAULT 0 CHECK (probabilidad_compra BETWEEN 0 AND 100),
    senales_interes JSONB DEFAULT '[]'::jsonb,
    senales_rechazo JSONB DEFAULT '[]'::jsonb,
    
    producto_recomendado_id UUID REFERENCES productos(id),
    paquete_recomendado_id UUID REFERENCES paquetes(id),
    
    email_notificacion_enviado BOOLEAN DEFAULT FALSE,
    fecha_email_enviado TIMESTAMP WITH TIME ZONE,
    
    inicio_sesion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fin_sesion TIMESTAMP WITH TIME ZONE,
    total_mensajes INTEGER DEFAULT 0
);

CREATE INDEX idx_conv_lead ON conversaciones(lead_id);
CREATE INDEX idx_conv_session ON conversaciones(session_id);
CREATE INDEX idx_conv_activa ON conversaciones(estado) WHERE estado = 'activa';
CREATE INDEX idx_conv_prob_alta ON conversaciones(probabilidad_compra DESC) WHERE probabilidad_compra >= 60;
CREATE INDEX idx_conv_estado_agente ON conversaciones USING gin(estado_agente);

CREATE TABLE mensajes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversacion_id UUID NOT NULL REFERENCES conversaciones(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('user', 'assistant', 'system')),
    contenido TEXT NOT NULL,
    embedding vector(384),
    intenciones JSONB,
    entidades JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_msg_conv_created ON mensajes(conversacion_id, created_at);
CREATE INDEX idx_msg_lead ON mensajes(lead_id);
CREATE INDEX idx_msg_embedding ON mensajes USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100) WHERE embedding IS NOT NULL;

CREATE TABLE conocimiento_rag (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('caso_exito', 'objecion', 'faq', 'regulacion', 'guia_producto')),
    titulo VARCHAR(300) NOT NULL,
    contenido TEXT NOT NULL,
    metadata JSONB,
    embedding vector(384) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rag_tipo ON conocimiento_rag(tipo);
CREATE INDEX idx_rag_embedding ON conocimiento_rag USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_rag_activo ON conocimiento_rag(activo) WHERE activo = TRUE;

CREATE TABLE conversaciones_etiquetadas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversacion_id UUID NOT NULL UNIQUE REFERENCES conversaciones(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id),
    resultado VARCHAR(50) NOT NULL CHECK (resultado IN ('venta_ganada', 'venta_perdida', 'abandono', 'en_proceso')),
    metodo_etiquetado VARCHAR(50) NOT NULL DEFAULT 'manual' CHECK (metodo_etiquetado IN ('manual', 'webhook', 'automatico')),
    momento_critico TEXT,
    objecion_principal VARCHAR(100),
    respuesta_agente_objecion TEXT,
    efectividad_respuesta INTEGER CHECK (efectividad_respuesta BETWEEN 1 AND 10),
    producto_ofrecido UUID REFERENCES productos(id),
    paquete_ofrecido UUID REFERENCES paquetes(id),
    precio_mencionado DECIMAL(10,2),
    patron_ganador BOOLEAN DEFAULT FALSE,
    patron_perdedor BOOLEAN DEFAULT FALSE,
    etiquetado_por_usuario_id UUID REFERENCES usuarios(id),
    notas_vendedor TEXT,
    confianza_etiquetado INTEGER CHECK (confianza_etiquetado BETWEEN 0 AND 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conv_etiq_resultado ON conversaciones_etiquetadas(resultado);
CREATE INDEX idx_conv_etiq_objecion ON conversaciones_etiquetadas(objecion_principal);
CREATE INDEX idx_conv_etiq_patron_ganador ON conversaciones_etiquetadas(patron_ganador) WHERE patron_ganador = TRUE;

CREATE TABLE patrones_aprendidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo_patron VARCHAR(50) NOT NULL CHECK (tipo_patron IN ('objecion_exitosa', 'momento_cierre', 'frase_ganadora', 'error_comun')),
    contexto TEXT NOT NULL,
    respuesta_agente TEXT NOT NULL,
    tasa_exito DECIMAL(5,2),
    veces_usado INTEGER DEFAULT 0,
    veces_exitoso INTEGER DEFAULT 0,
    embedding_contexto vector(384),
    conversaciones_origen UUID[],
    aprobado_para_uso BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_patrones_tipo ON patrones_aprendidos(tipo_patron);
CREATE INDEX idx_patrones_tasa ON patrones_aprendidos(tasa_exito DESC);
CREATE INDEX idx_patrones_emb ON patrones_aprendidos USING ivfflat (embedding_contexto vector_cosine_ops) WITH (lists = 50);
CREATE INDEX idx_patrones_aprobado ON patrones_aprendidos(aprobado_para_uso) WHERE aprobado_para_uso = TRUE;

CREATE TABLE sesiones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expira_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revocado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sesiones_token ON sesiones(token_hash);
CREATE INDEX idx_sesiones_expira ON sesiones(expira_at) WHERE NOT revocado;

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER leads_timestamp 
    BEFORE UPDATE ON leads 
    FOR EACH ROW 
    EXECUTE FUNCTION update_timestamp();

CREATE OR REPLACE FUNCTION increment_total_mensajes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE conversaciones 
    SET total_mensajes = total_mensajes + 1
    WHERE id = NEW.conversacion_id;
    
    UPDATE leads
    SET ultima_interaccion = NEW.created_at
    WHERE id = NEW.lead_id;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_increment_mensajes
    AFTER INSERT ON mensajes
    FOR EACH ROW
    EXECUTE FUNCTION increment_total_mensajes();

CREATE OR REPLACE FUNCTION get_conversation_state(p_session_id VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_state JSONB;
BEGIN
    SELECT jsonb_build_object(
        'conversacion_id', c.id::text,
        'lead_id', c.lead_id::text,
        'session_id', c.session_id,
        'estado_agente', c.estado_agente,
        'probabilidad', c.probabilidad_compra,
        'senales_interes', c.senales_interes,
        'senales_rechazo', c.senales_rechazo,
        'total_mensajes', c.total_mensajes,
        'lead_data', jsonb_build_object(
            'nombre', l.nombre_completo,
            'email', l.email,
            'telefono', l.telefono,
            'empresa', l.empresa,
            'sector', l.sector,
            'presupuesto', l.presupuesto_declarado,
            'urgencia_dias', l.urgencia_dias
        )
    ) INTO v_state
    FROM conversaciones c
    LEFT JOIN leads l ON c.lead_id = l.id
    WHERE c.session_id = p_session_id;
    
    RETURN COALESCE(v_state, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION update_conversation_state(
    p_session_id VARCHAR,
    p_estado_agente JSONB,
    p_probabilidad INTEGER,
    p_senales_interes JSONB,
    p_senales_rechazo JSONB
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE conversaciones
    SET 
        estado_agente = p_estado_agente,
        probabilidad_compra = p_probabilidad,
        senales_interes = p_senales_interes,
        senales_rechazo = p_senales_rechazo
    WHERE session_id = p_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION search_similar_messages(
    p_query_embedding vector(384),
    p_conversacion_id UUID,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    contenido TEXT,
    rol VARCHAR,
    similitud FLOAT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.contenido,
        m.rol,
        1 - (m.embedding <=> p_query_embedding) as similitud,
        m.created_at
    FROM mensajes m
    WHERE m.conversacion_id = p_conversacion_id
        AND m.embedding IS NOT NULL
        AND (1 - (m.embedding <=> p_query_embedding)) >= 0.7
    ORDER BY m.embedding <=> p_query_embedding
    LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION buscar_conocimiento(
    p_query_embedding vector(384),
    p_tipos VARCHAR[] DEFAULT NULL,
    p_limit INTEGER DEFAULT 5,
    p_umbral FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id UUID,
    tipo VARCHAR,
    titulo VARCHAR,
    contenido TEXT,
    similitud FLOAT,
    metadata JSONB
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT 
        k.id,
        k.tipo,
        k.titulo,
        k.contenido,
        1 - (k.embedding <=> p_query_embedding) as similitud,
        k.metadata
    FROM conocimiento_rag k
    WHERE k.activo = TRUE
        AND (p_tipos IS NULL OR k.tipo = ANY(p_tipos))
        AND (1 - (k.embedding <=> p_query_embedding)) >= p_umbral
    ORDER BY k.embedding <=> p_query_embedding
    LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION calcular_score_lead(p_lead_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
    v_score INTEGER := 0;
    v_urgencia INTEGER;
    v_presupuesto DECIMAL;
    v_decisor BOOLEAN;
    v_total_msgs INTEGER;
BEGIN
    SELECT 
        urgencia_dias,
        presupuesto_declarado,
        es_decisor
    INTO v_urgencia, v_presupuesto, v_decisor
    FROM leads WHERE id = p_lead_id;
    
    SELECT COUNT(*) INTO v_total_msgs
    FROM mensajes 
    WHERE lead_id = p_lead_id AND rol = 'user';
    
    IF v_urgencia IS NOT NULL AND v_urgencia <= 7 THEN 
        v_score := v_score + 40; 
    END IF;
    
    IF v_presupuesto IS NOT NULL AND v_presupuesto >= 100 THEN 
        v_score := v_score + 30; 
    END IF;
    
    IF v_decisor = TRUE THEN 
        v_score := v_score + 20; 
    END IF;
    
    IF v_total_msgs >= 5 THEN 
        v_score := v_score + 10; 
    END IF;
    
    UPDATE leads 
    SET score_total = LEAST(v_score, 100)
    WHERE id = p_lead_id;
    
    RETURN v_score;
END;
$$;

INSERT INTO usuarios (email, password_hash, nombre_completo, rol) VALUES 
('admin@empresa.com', crypt('admin123', gen_salt('bf')), 'Admin Sistema', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO productos (nombre, slug, descripcion_corta, precio_base, sectores, features) VALUES
('CRM + FACTURACIÓN SUNAT', 'crm-facturacion', 'Gestión completa con facturación electrónica certificada', 99.00, 
 ARRAY['retail', 'servicios', 'gastronomia'], 
 ARRAY['Facturación electrónica', 'Gestión de deudas', 'Reportes SUNAT', 'Integración PSE'])
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO productos (nombre, slug, descripcion_corta, precio_base, sectores, features) VALUES
('AGENTES IA COBRANZAS', 'agentes-ia', 'Automatización de cobranzas y atención 24/7', 79.00,
 ARRAY['retail', 'servicios', 'turismo'],
 ARRAY['WhatsApp integrado', 'IA conversacional', 'Recordatorios automáticos'])
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO productos (nombre, slug, descripcion_corta, precio_base, sectores, features) VALUES
('DASHBOARD ANALYTICS', 'dashboard', 'Visualiza métricas y compara con tu sector', 99.00,
 ARRAY['todos'],
 ARRAY['Métricas en tiempo real', 'Comparación sectorial', 'Alertas automáticas'])
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO paquetes (producto_id, nombre, slug, precio_mensual, precio_anual, ideal_para, limites, destacado)
SELECT id, 'Micro', 'crm-micro', 99.00, 990.00, ARRAY['microempresas', 'bodegas'], '{"usuarios": 5, "docs": 50}'::jsonb, false 
FROM productos WHERE slug = 'crm-facturacion'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO paquetes (producto_id, nombre, slug, precio_mensual, precio_anual, ideal_para, limites, destacado)
SELECT id, 'PYME', 'crm-pyme', 299.00, 2990.00, ARRAY['pyme', 'empresas_formales'], '{"usuarios": 20}'::jsonb, true 
FROM productos WHERE slug = 'crm-facturacion'
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS graph_checkpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id VARCHAR(255) NOT NULL,
    checkpoint_ns VARCHAR(255) NOT NULL DEFAULT '',
    checkpoint_id VARCHAR(255) NOT NULL,
    parent_checkpoint_id VARCHAR(255),
    checkpoint_data BYTEA NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(thread_id, checkpoint_ns, checkpoint_id)
);

CREATE INDEX idx_checkpoints_thread ON graph_checkpoints(thread_id, checkpoint_ns);
CREATE INDEX idx_checkpoints_created ON graph_checkpoints(created_at DESC);



CREATE TABLE IF NOT EXISTS productos_audit (
    id SERIAL PRIMARY KEY,
    producto_id UUID NOT NULL,
    accion VARCHAR(20) NOT NULL,
    usuario_id UUID,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_producto ON productos_audit(producto_id);
CREATE INDEX idx_audit_fecha ON productos_audit(created_at DESC);

CREATE OR REPLACE FUNCTION audit_producto_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO productos_audit (producto_id, accion, datos_nuevos)
        VALUES (NEW.id, 'INSERT', row_to_json(NEW)::jsonb);
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO productos_audit (producto_id, accion, datos_anteriores, datos_nuevos)
        VALUES (NEW.id, 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO productos_audit (producto_id, accion, datos_anteriores)
        VALUES (OLD.id, 'DELETE', row_to_json(OLD)::jsonb);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_audit_productos ON productos;
CREATE TRIGGER trigger_audit_productos
    AFTER INSERT OR UPDATE OR DELETE ON productos
    FOR EACH ROW
    EXECUTE FUNCTION audit_producto_change();

