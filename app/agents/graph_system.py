"""
app/agents/graph_system.py - VERSIÓN OPTIMIZADA CON LANGGRAPH
- Pool DB mínimo (1 conexión)
- 1 query unificada para RAG + Productos
- Cache embeddings reducido (10 items)
- Checkpointer optimizado
"""
from typing import TypedDict, Annotated, Sequence, Dict, Any
from langgraph.graph import StateGraph, END
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, update as sql_update
from datetime import datetime, timezone
from uuid import UUID
import operator
import json

from app.models import Lead, Conversacion, Mensaje
from app.services.embeddings import embedding_service
from app.tools.email_tools import send_lead_notification, send_client_card


class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    lead_id: str
    conversacion_id: str
    session_id: str
    
    extracted_data: dict
    profile: str
    cooperatividad: int
    probability: int
    interest_signals: list
    
    current_stage: str
    productos_recomendados: list
    mensaje_count: int
    
    should_close: bool
    is_first_interaction: bool


class SalesAgent:
    
    def __init__(self, db: AsyncSession, openai_key: str, checkpointer=None):
        self.db = db
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.7,
            api_key=openai_key,
            max_tokens=400,
            timeout=25.0
        )
        self.extractor_llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.0,
            api_key=openai_key,
            max_tokens=200
        )
        self.checkpointer = checkpointer
        self.graph = self._build_graph()
    
    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(AgentState)
        
        workflow.add_node("initialize", self._initialize)
        workflow.add_node("extract_with_llm", self._extract_with_llm)
        workflow.add_node("qualify", self._qualify)
        workflow.add_node("respond", self._respond)
        workflow.add_node("finalize", self._finalize)
        
        workflow.set_entry_point("initialize")
        workflow.add_edge("initialize", "extract_with_llm")
        workflow.add_edge("extract_with_llm", "qualify")
        workflow.add_edge("qualify", "respond")
        
        workflow.add_conditional_edges(
            "respond",
            lambda s: "close" if s.get("should_close") else "continue",
            {"close": "finalize", "continue": END}
        )
        
        workflow.add_edge("finalize", END)
        
        return workflow.compile(checkpointer=self.checkpointer)
    
    def _get_user_message(self, state: AgentState) -> str:
        for msg in reversed(state["messages"]):
            if isinstance(msg, HumanMessage):
                return msg.content
        return ""
    
    async def _initialize(self, state: AgentState) -> AgentState:
        session_id = state["session_id"]
        
        result = await self.db.execute(
            text("SELECT get_conversation_state(:session_id)"),
            {"session_id": session_id}
        )
        db_state = result.scalar()
        
        if not db_state or not db_state.get("conversacion_id"):
            lead = Lead(origen="web_chat", estado="nuevo")
            self.db.add(lead)
            await self.db.flush()
            
            conv = Conversacion(
                lead_id=lead.id,
                session_id=session_id,
                canal="web_chat",
                estado="activa"
            )
            self.db.add(conv)
            await self.db.flush()
            await self.db.commit()
            
            state.update({
                "lead_id": str(lead.id),
                "conversacion_id": str(conv.id),
                "current_stage": "saludo",
                "probability": 0,
                "interest_signals": [],
                "extracted_data": {},
                "mensaje_count": 0,
                "profile": "explorador",
                "cooperatividad": 50,
                "should_close": False,
                "productos_recomendados": [],
                "is_first_interaction": True
            })
            
            saludo_inicial = "¡Hola! Soy Artur, asistente de NexWebs. ¿Cómo puedo ayudarte hoy?"
            state["messages"].append(AIMessage(content=saludo_inicial))
            
            embedding = embedding_service.encode_single(saludo_inicial)
            mensaje = Mensaje(
                conversacion_id=UUID(state["conversacion_id"]),
                lead_id=UUID(state["lead_id"]),
                rol="assistant",
                contenido=saludo_inicial,
                embedding=embedding,
                intenciones={"strategy": "greeting", "is_initial": True}
            )
            self.db.add(mensaje)
            await self.db.flush()
            await self.db.commit()
        else:
            estado_conv = db_state.get("estado_conversacion")
            if estado_conv == "finalizada":
                state["should_close"] = True
                state["messages"].append(AIMessage(
                    content="Esta conversación ya ha finalizado. Por favor, recarga la página para iniciar una nueva."
                ))
                return state
            
            estado_agente = db_state.get("estado_agente", {})
            extracted = estado_agente.get("extracted_data", {})
            
            state.update({
                "lead_id": db_state["lead_id"],
                "conversacion_id": db_state["conversacion_id"],
                "probability": db_state.get("probabilidad", 0),
                "interest_signals": db_state.get("senales_interes", []),
                "current_stage": estado_agente.get("current_stage", "descubrimiento"),
                "extracted_data": extracted,
                "mensaje_count": db_state.get("total_mensajes", 0),
                "profile": estado_agente.get("lead_profile", "explorador"),
                "cooperatividad": estado_agente.get("cooperatividad_score", 50),
                "should_close": False,
                "productos_recomendados": estado_agente.get("productos_recomendados", []),
                "is_first_interaction": False
            })
        
        return state
    
    async def _extract_with_llm(self, state: AgentState) -> AgentState:
        if state.get("should_close"):
            return state
            
        user_msg = self._get_user_message(state)
        current_data = state["extracted_data"].copy()
        
        missing_fields = []
        if not current_data.get("nombre"):
            missing_fields.append("nombre")
        if not current_data.get("email"):
            missing_fields.append("email")
        if not current_data.get("telefono"):
            missing_fields.append("telefono")
        if not current_data.get("sector"):
            missing_fields.append("sector")
        
        if not missing_fields:
            return state
        
        extraction_prompt = f"""Extrae SOLO los datos faltantes del mensaje del usuario.

MENSAJE: "{user_msg}"

DATOS YA CAPTURADOS (NO TOCAR):
{json.dumps(current_data, ensure_ascii=False)}

CAMPOS FALTANTES QUE DEBES BUSCAR:
{', '.join(missing_fields)}

REGLAS:
- SOLO extrae campos que están en la lista de FALTANTES
- Si no encuentras un campo faltante, devuelve null para ese campo
- "nombre": primer nombre capitalizado (ej: "valerio" → "Valerio")
- "sector": mapea a [retail, ecommerce, gastronomia, salud, servicios, telecomunicaciones]
  · distribución/productos = retail
  · online/internet = ecommerce
  · restaurante/comida = gastronomia
  · ventas/telefónicas/telemarketing = telecomunicaciones
  · servicio/consultoría = servicios
- "email": formato válido
- "telefono": solo dígitos (9 dígitos en Perú)

RESPONDE SOLO JSON CON LOS CAMPOS FALTANTES:"""

        extraction_msg = await self.extractor_llm.ainvoke([
            SystemMessage(content="Eres un extractor de datos. Responde SOLO JSON válido con campos faltantes."),
            HumanMessage(content=extraction_prompt)
        ])
        
        try:
            raw_response = extraction_msg.content.strip()
            if raw_response.startswith("```json"):
                raw_response = raw_response.split("```json")[1].split("```")[0].strip()
            elif raw_response.startswith("```"):
                raw_response = raw_response.split("```")[1].split("```")[0].strip()
            
            extracted = json.loads(raw_response)
            
            for k, v in extracted.items():
                if k in missing_fields and v and v not in [None, "", "null", "N/A", "None"]:
                    current_data[k] = v
            
            state["extracted_data"] = current_data
            
            if current_data:
                updates = {}
                if current_data.get("nombre"):
                    updates["nombre_completo"] = current_data["nombre"]
                if current_data.get("email"):
                    updates["email"] = current_data["email"]
                if current_data.get("telefono"):
                    updates["telefono"] = current_data["telefono"]
                if current_data.get("empresa"):
                    updates["empresa"] = current_data["empresa"]
                if current_data.get("sector"):
                    updates["sector"] = current_data["sector"]
                
                if updates:
                    updates["updated_at"] = datetime.now(timezone.utc)
                    await self.db.execute(
                        sql_update(Lead)
                        .where(Lead.id == UUID(state["lead_id"]))
                        .values(**updates)
                    )
                    await self.db.commit()
        
        except Exception as e:
            print(f"Error extracción LLM: {e}")
        
        return state

    def _detect_product_interest(self, user_msg: str) -> str:
        msg_lower = user_msg.lower()
        
        dashboard_keywords = [
            "dashboard", "analítico", "analytics", "métricas", 
            "reportes", "datos", "visualiz", "kpi", "indicadores",
            "análisis", "business intelligence", "bi"
        ]
        crm_keywords = [
            "crm", "facturación", "sunat", "clientes", "gestión",
            "ventas", "factura", "boleta", "comprobante"
        ]
        agentes_keywords = [
            "agente", "ia", "cobranza", "whatsapp", "automatización",
            "bot", "chatbot", "inteligencia artificial", "automático"
        ]
        
        if any(kw in msg_lower for kw in dashboard_keywords):
            return "dashboard"
        elif any(kw in msg_lower for kw in crm_keywords):
            return "crm-facturacion"
        elif any(kw in msg_lower for kw in agentes_keywords):
            return "agentes-ia"
        
        return None

    async def _qualify(self, state: AgentState) -> AgentState:
        if state.get("should_close"):
            return state
            
        extracted = state["extracted_data"]
        user_msg = self._get_user_message(state).lower()
        
        interes_kw = {
            "interesado": 10, "quiero": 10, "necesito": 9,
            "dashboard": 15, "crm": 15, "agente": 15, "precio": 7
        }
        for kw, peso in interes_kw.items():
            if kw in user_msg:
                state["interest_signals"].append({
                    "tipo": kw,
                    "peso": peso,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
        
        score = 20
        for sig in state["interest_signals"]:
            score += sig.get("peso", 5)
        
        bonuses = {
            "nombre": 10, "email": 20, "telefono": 15,
            "sector": 10, "empresa": 5
        }
        for field, bonus in bonuses.items():
            if extracted.get(field):
                score += bonus
        
        state["probability"] = max(0, min(100, score))
        
        if state["probability"] < 40:
            state["current_stage"] = "descubrimiento"
        elif state["probability"] < 70:
            state["current_stage"] = "calificacion"
        else:
            state["current_stage"] = "cierre"
        
        if state["productos_recomendados"]:
            return state
        
        interes_producto = self._detect_product_interest(self._get_user_message(state))
        
        if not interes_producto:
            query_embedding = embedding_service.encode_single(user_msg)
            
            result = await self.db.execute(
                text("""
                    SELECT k.contenido, k.titulo,
                        1 - (k.embedding <=> CAST(:embedding AS vector)) as similitud
                    FROM conocimiento_rag k
                    WHERE k.tipo = 'guia_producto'
                    AND k.activo = TRUE
                    AND (1 - (k.embedding <=> CAST(:embedding AS vector))) >= 0.65
                    ORDER BY k.embedding <=> CAST(:embedding AS vector)
                    LIMIT 1
                """),
                {"embedding": str(query_embedding)}
            )
            
            rag_row = result.fetchone()
            if rag_row:
                titulo = rag_row[1]
                if "DASHBOARD" in titulo.upper():
                    interes_producto = "dashboard"
                elif "CRM" in titulo.upper():
                    interes_producto = "crm-facturacion"
                elif "AGENTE" in titulo.upper():
                    interes_producto = "agentes-ia"
        
        sector = extracted.get("sector")
        
        if interes_producto:
            result = await self.db.execute(
                text("""
                    SELECT p.nombre, p.descripcion_corta, p.precio_base, p.slug,
                        json_agg(
                            json_build_object(
                                'nombre', pk.nombre,
                                'precio_mensual', pk.precio_mensual
                            )
                        ) FILTER (WHERE pk.id IS NOT NULL) as paquetes
                    FROM productos p
                    LEFT JOIN paquetes pk ON pk.producto_id = p.id AND pk.activo = TRUE
                    WHERE p.activo = TRUE AND p.slug = :slug
                    GROUP BY p.id
                    LIMIT 1
                """),
                {"slug": interes_producto}
            )
            
            productos_lista = []
            for row in result.fetchall():
                productos_lista.append({
                    "nombre": row[0],
                    "descripcion": row[1],
                    "precio_base": float(row[2]),
                    "slug": row[3],
                    "paquetes": row[4] or []
                })
            
            state["productos_recomendados"] = productos_lista
        
        elif sector and not state["productos_recomendados"]:
            result = await self.db.execute(
                text("""
                    SELECT p.nombre, p.descripcion_corta, p.precio_base, p.slug,
                        json_agg(
                            json_build_object(
                                'nombre', pk.nombre,
                                'precio_mensual', pk.precio_mensual
                            )
                        ) FILTER (WHERE pk.id IS NOT NULL) as paquetes
                    FROM productos p
                    LEFT JOIN paquetes pk ON pk.producto_id = p.id AND pk.activo = TRUE
                    WHERE p.activo = TRUE
                    AND (:sector = ANY(p.sectores) OR 'todos' = ANY(p.sectores))
                    GROUP BY p.id
                    LIMIT 2
                """),
                {"sector": sector}
            )
            
            productos_lista = []
            for row in result.fetchall():
                productos_lista.append({
                    "nombre": row[0],
                    "descripcion": row[1],
                    "precio_base": float(row[2]),
                    "slug": row[3],
                    "paquetes": row[4] or []
                })
            
            state["productos_recomendados"] = productos_lista
        
        return state
        
    async def _respond(self, state: AgentState) -> AgentState:
        if state.get("should_close"):
            return state
            
        extracted = state["extracted_data"]
        msg_count = state["mensaje_count"]
        user_msg = self._get_user_message(state)
        
        has_nombre = bool(extracted.get("nombre"))
        has_sector = bool(extracted.get("sector"))
        has_email = bool(extracted.get("email"))
        has_telefono = bool(extracted.get("telefono"))
        has_contact = has_email or has_telefono
        
        despedida_kw = ["adios", "gracias chao", "hasta luego", "bye"]
        if any(kw in user_msg.lower() for kw in despedida_kw) and msg_count > 1:
            state["should_close"] = True
            strategy = "farewell"
        elif state["is_first_interaction"]:
            strategy = "greeting"
        elif not has_nombre:
            strategy = "ask_name_only"
        elif has_nombre and not has_sector:
            strategy = "ask_sector"
        elif has_nombre and has_sector and has_email and has_telefono:
            strategy = "close_confirmed"
            state["should_close"] = True
        elif has_nombre and has_sector and not has_contact:
            strategy = "present_ask_contact"
        elif has_nombre and has_sector and (has_email or has_telefono):
            missing = "teléfono" if not has_telefono else "correo"
            strategy = f"ask_missing_{missing}"
        elif msg_count >= 10:
            strategy = "soft_close"
            state["should_close"] = True
        else:
            strategy = "continue"
        
        productos_info = ""
        if state["productos_recomendados"]:
            for p in state["productos_recomendados"]:
                productos_info += f"\n- {p['nombre']}: {p['descripcion']}"
                if p.get("paquetes"):
                    for paq in p["paquetes"][:2]:
                        productos_info += f"\n  · {paq['nombre']} (S/{paq['precio_mensual']}/mes)"
        
        conversation_history = ""
        for msg in state["messages"][-4:]:
            role = "Usuario" if isinstance(msg, HumanMessage) else "Tú"
            conversation_history += f"{role}: {msg.content}\n"
        
        system_prompt = f"""Eres Artur, asistente de ventas de NexWebs.

HISTORIAL RECIENTE:
{conversation_history}

DATOS CAPTURADOS:
{json.dumps(extracted, ensure_ascii=False, indent=2)}

PRODUCTOS DETECTADOS Y DISPONIBLES:{productos_info}

ESTRATEGIA: {strategy}

REGLA CRÍTICA DE PRODUCTOS:
- Si el usuario mencionó un producto específico (dashboard, CRM, agentes IA), SIEMPRE menciona ESE producto detectado
- NO cambies el producto en el cierre si ya fue detectado
- Los productos detectados están en la lista de arriba

INSTRUCCIONES POR ESTRATEGIA:

greeting:
- Di: "¡Hola! Soy Artur, asistente de NexWebs. ¿Cómo puedo ayudarte hoy?"
- NO menciones productos
- Máximo 20 palabras

ask_name_only:
- Si hay producto detectado: "Perfecto, nuestro {state['productos_recomendados'][0]['nombre'] if state['productos_recomendados'] else 'producto'} es ideal."
- Pregunta SOLO el nombre: "¿Cuál es tu nombre?"
- Máximo 20 palabras

ask_sector:
- Saluda: "¡Hola {extracted.get('nombre', '')}!"
- Pregunta: "¿En qué sector trabajas?" o "¿A qué se dedica tu negocio?"
- Máximo 20 palabras

present_ask_contact:
- Menciona el PRODUCTO YA DETECTADO (si existe): "{state['productos_recomendados'][0]['nombre'] if state['productos_recomendados'] else 'Nuestro producto'}"
- Pide AMBOS: "¿Me compartes tu correo y teléfono?"
- Máximo 35 palabras

ask_missing_teléfono:
- Di: "Perfecto, solo me falta tu teléfono para que un asesor se contacte contigo"
- Máximo 20 palabras

ask_missing_correo:
- Di: "Perfecto, solo me falta tu correo para enviarte la información"
- Máximo 20 palabras

close_confirmed:
- Menciona el PRODUCTO DETECTADO originalmente
- Agradece
- Di: "Un asesor se contactará contigo sobre {state['productos_recomendados'][0]['nombre'] if state['productos_recomendados'] else 'nuestras soluciones'}"
- Confirma: "Te enviamos información a {extracted.get('email', 'tu correo')}"
- Máximo 30 palabras

farewell:
- Agradece
- Despedida cordial
- Máximo 15 palabras

REGLAS ABSOLUTAS:
- Tono amigable peruano profesional
- NO uses emojis excesivos (1-2 máximo)
- Si tienes nombre del usuario, úsalo
- Sigue EXACTAMENTE la estrategia
- NO inventes datos
- NUNCA preguntes algo que ya fue respondido
- MANTÉN CONSISTENCIA con el producto detectado desde el inicio
"""
        
        messages = [SystemMessage(content=system_prompt)]
        for msg in state["messages"][-5:]:
            messages.append(msg)
        
        response = await self.llm.ainvoke(messages)
        response_text = response.content.strip()
        
        state["messages"].append(AIMessage(content=response_text))
        
        embedding = embedding_service.encode_single(response_text)
        mensaje = Mensaje(
            conversacion_id=UUID(state["conversacion_id"]),
            lead_id=UUID(state["lead_id"]),
            rol="assistant",
            contenido=response_text,
            embedding=embedding,
            intenciones={"strategy": strategy, "probability": state["probability"]}
        )
        self.db.add(mensaje)
        await self.db.flush()
        
        estado_agente_dict = {
            "current_stage": state["current_stage"],
            "extracted_data": extracted,
            "lead_profile": state["profile"],
            "cooperatividad_score": state["cooperatividad"],
            "productos_recomendados": state["productos_recomendados"]
        }
        
        await self.db.execute(
            sql_update(Conversacion)
            .where(Conversacion.session_id == state["session_id"])
            .values(
                estado_agente=estado_agente_dict,
                probabilidad_compra=state["probability"],
                senales_interes=state["interest_signals"]
            )
        )
        
        await self.db.commit()
        state["mensaje_count"] += 1
        state["is_first_interaction"] = False
        
        return state
    
    async def _finalize(self, state: AgentState) -> AgentState:
        extracted = state["extracted_data"]
        prob = state["probability"]
        email = extracted.get("email")
        telefono = extracted.get("telefono")
        nombre = extracted.get("nombre", "Cliente")
        
        if (email or telefono) and prob >= 40:
            try:
                await send_lead_notification(lead_data=extracted, probabilidad=prob)
                
                if email:
                    await send_client_card(email_cliente=email, nombre_cliente=nombre)
                
                await self.db.execute(
                    sql_update(Conversacion)
                    .where(Conversacion.id == UUID(state["conversacion_id"]))
                    .values(
                        email_notificacion_enviado=True,
                        fecha_email_enviado=datetime.now(timezone.utc)
                    )
                )
            except Exception as e:
                print(f"Error emails: {e}")
        
        await self.db.execute(
            sql_update(Conversacion)
            .where(Conversacion.id == UUID(state["conversacion_id"]))
            .values(estado="finalizada", fin_sesion=datetime.now(timezone.utc))
        )
        await self.db.commit()
        
        return state
    
    async def process_message(
        self,
        session_id: str,
        message: str = None,
        initial_state: dict = None
    ) -> dict:
        state = initial_state or {"messages": [], "session_id": session_id}
        
        if message:
            state["messages"].append(HumanMessage(content=message))
        
        config = {"configurable": {"thread_id": session_id}}
        final_state = await self.graph.ainvoke(state, config)
        
        if message and final_state.get("conversacion_id") and final_state.get("lead_id"):
            embedding = embedding_service.encode_single(message)
            user_msg = Mensaje(
                conversacion_id=UUID(final_state["conversacion_id"]),
                lead_id=UUID(final_state["lead_id"]),
                rol="user",
                contenido=message,
                embedding=embedding
            )
            self.db.add(user_msg)
            await self.db.flush()
            await self.db.commit()
        
        last_ai_msg = None
        for msg in reversed(final_state["messages"]):
            if isinstance(msg, AIMessage):
                last_ai_msg = msg.content
                break
        
        return {
            "response": last_ai_msg or "Error",
            "state": final_state,
            "probability": final_state.get("probability", 0),
            "stage": final_state.get("current_stage", "descubrimiento"),
            "profile": final_state.get("profile", "explorador"),
            "extracted": final_state.get("extracted_data", {}),
            "productos": final_state.get("productos_recomendados", []),
            "closed": final_state.get("should_close", False)
        }


async def initialize_system(db: AsyncSession, openai_key: str, checkpointer=None) -> SalesAgent:
    return SalesAgent(db, openai_key, checkpointer)