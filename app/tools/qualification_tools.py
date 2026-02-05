"""
app/tools/qualification_tools.py
Herramientas mejoradas con análisis semántico - FIX presupuesto
"""
from langchain_core.tools import tool
from typing import Dict, List, Optional, Any
import re
from datetime import datetime

@tool
def extract_lead_info(message: str, context: Dict[str, Any]) -> Dict[str, Optional[str]]:
    """Extrae información del lead del mensaje del usuario"""
    msg_lower = message.lower()
    extracted = {}
    
    if not context.get("nombre"):
        nombre_patterns = [
            r"(?:soy|me llamo|mi nombre es|mi nombre:)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)",
            r"^([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)\s*[,\s]+(?:\d|[a-z0-9._%+-]+@)",
            r"^([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)\s*[,\s!]",
        ]
        for pattern in nombre_patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                nombre_raw = match.group(1).strip()
                if len(nombre_raw) >= 3 and nombre_raw.lower() not in ['hola', 'buenos', 'buenas']:
                    extracted["nombre"] = nombre_raw.title()
                    break
    
    if not context.get("email"):
        email_match = re.search(r'\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b', message)
        if email_match:
            extracted["email"] = email_match.group(0).lower()
    
    if not context.get("telefono"):
        phone_patterns = [
            r'\b(\+?51\s?)?9\d{8}\b',
            r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{3}\b',
            r'\b9\d{8}\b',
        ]
        for pattern in phone_patterns:
            match = re.search(pattern, message)
            if match:
                phone = re.sub(r'[-.\s+]', '', match.group(0))
                extracted["telefono"] = phone
                break
    
    if not context.get("empresa"):
        empresa_patterns = [
            r"(?:de la empresa|trabajo en|mi empresa es|negocio de)\s+([a-záéíóúñ\s]+)",
            r"(?:soy|tengo)\s+(?:una?|un)\s+(bodega|restaurante|taller|tienda|farmacia)",
        ]
        for pattern in empresa_patterns:
            match = re.search(pattern, msg_lower)
            if match:
                extracted["empresa"] = match.group(1).strip().title()
                break
    
    if not context.get("presupuesto"):
        presupuesto_patterns = [
            r"(?:tengo|cuento con|presupuesto de?|dispongo de?)\s+(?:un\s+)?s/?\.?\s?(\d{2,5})",
            r"(?:hasta|máximo|puedo pagar)\s+s/?\.?\s?(\d{2,5})",
            r"(\d{2,5})\s+soles",
        ]
        for pattern in presupuesto_patterns:
            match = re.search(pattern, msg_lower)
            if match:
                presupuesto_num = match.group(1)
                if 100 <= int(presupuesto_num) <= 100000:
                    extracted["presupuesto"] = presupuesto_num
                    break
    
    urgencia_keywords = {
        "urgente": 3,
        "rápido": 7,
        "pronto": 14,
        "esta semana": 7,
        "este mes": 30,
    }
    if not context.get("urgencia_dias"):
        for keyword, dias in urgencia_keywords.items():
            if keyword in msg_lower:
                extracted["urgencia_dias"] = dias
                break
    
    sectores_keywords = {
        "bodega": "retail",
        "restaurante": "gastronomia",
        "taller": "servicios",
        "farmacia": "salud",
        "tienda": "retail",
        "ecommerce": "retail",
    }
    if not context.get("sector"):
        for keyword, sector in sectores_keywords.items():
            if keyword in msg_lower:
                extracted["sector"] = sector
                break
    
    return extracted

@tool
def detect_interest_signals(message: str) -> List[Dict[str, Any]]:
    """Detecta señales de interés en el mensaje del usuario"""
    msg_lower = message.lower()
    signals = []
    
    strong_signals = {
        "cuánto cuesta": {"tipo": "pregunta_precio", "peso": 10},
        "precio": {"tipo": "pregunta_precio", "peso": 10},
        "quiero": {"tipo": "intencion_compra", "peso": 10},
        "necesito": {"tipo": "necesidad", "peso": 9},
        "demo": {"tipo": "solicita_demo", "peso": 9},
    }
    
    medium_signals = {
        "interesa": {"tipo": "interes_general", "peso": 7},
        "cómo funciona": {"tipo": "pregunta_tecnica", "peso": 6},
    }
    
    for keyword, signal_data in {**strong_signals, **medium_signals}.items():
        if keyword in msg_lower:
            signals.append({
                "tipo": signal_data["tipo"],
                "contenido": keyword,
                "peso": signal_data["peso"],
                "timestamp": datetime.utcnow().isoformat()
            })
    
    if re.search(r"(?:presupuesto|tengo|cuento)\s+(?:de\s+)?s/?\.?\s?\d{2,5}", msg_lower):
        signals.append({
            "tipo": "menciona_presupuesto",
            "contenido": "presupuesto",
            "peso": 10,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    if re.search(r'\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b', message):
        signals.append({
            "tipo": "da_email",
            "contenido": "email",
            "peso": 15,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    return signals

@tool
def detect_rejection_signals(message: str) -> List[Dict[str, Any]]:
    """Detecta señales de rechazo en el mensaje del usuario"""
    msg_lower = message.lower()
    signals = []
    
    strong_rejection = {
        "muy caro": {"tipo": "precio_alto", "peso": -10},
        "costoso": {"tipo": "precio_alto", "peso": -10},
        "no me interesa": {"tipo": "no_interesa", "peso": -15},
    }
    
    medium_rejection = {
        "caro": {"tipo": "objecion_precio", "peso": -7},
        "complicado": {"tipo": "objecion_complejidad", "peso": -6},
    }
    
    for keyword, signal_data in {**strong_rejection, **medium_rejection}.items():
        if keyword in msg_lower:
            signals.append({
                "tipo": signal_data["tipo"],
                "contenido": keyword,
                "peso": signal_data["peso"],
                "timestamp": datetime.utcnow().isoformat()
            })
    
    return signals

@tool
def calculate_probability(
    interest_signals: List[Dict],
    rejection_signals: List[Dict],
    extracted_data: Dict
) -> int:
    """Calcula probabilidad de compra basada en señales y datos extraídos"""
    score = 30
    
    for signal in interest_signals:
        score += signal.get("peso", 5)
    
    for signal in rejection_signals:
        score += signal.get("peso", -5)
    
    data_bonus = {
        "nombre": 5,
        "email": 15,
        "telefono": 10,
        "empresa": 5,
        "presupuesto": 10,
        "urgencia_dias": 8,
    }
    
    for field, bonus in data_bonus.items():
        if extracted_data.get(field):
            score += bonus
    
    return max(0, min(100, score))