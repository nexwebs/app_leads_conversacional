"""
api/chat.py 
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.database import AsyncSessionLocal
from app.config import settings
from app.middleware.security import ws_manager, websocket_rate_limiter
from typing import Dict
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/{session_id}")
async def websocket_chat(websocket: WebSocket, session_id: str):
    client_host = websocket.client.host if websocket.client else "unknown"
    
    can_connect, message = await ws_manager.can_connect(client_host)
    
    if not can_connect:
        await websocket.close(code=1008, reason=message)
        return
    
    allowed, rate_message = await websocket_rate_limiter.check_rate_limit(
        type('Request', (), {'client': websocket.client, 'headers': websocket.headers})()
    )
    
    if not allowed:
        await websocket.close(code=1008, reason=rate_message)
        return
    
    await websocket.accept()
    ws_manager.connect(client_host)
    
    db = None
    
    try:
        db = AsyncSessionLocal()
        
        from app.agents.graph_system import initialize_system
        agent = await initialize_system(
            db=db,
            openai_key=settings.OPENAI_API_KEY
        )
        
        current_state = None
        
        initial_result = await agent.process_message(
            session_id=session_id,
            message=None,
            initial_state=current_state
        )
        
        current_state = initial_result["state"]
        
        if initial_result.get("closed"):
            await websocket.send_json({
                "type": "close",
                "data": {
                    "message": initial_result["response"],
                    "probabilidad_final": 0
                }
            })
            return
        
        await websocket.send_json({
            "type": "greeting",
            "data": {
                "response": initial_result["response"],
                "probabilidad": 0,
                "etapa": "saludo",
                "perfil": "explorador"
            }
        })
        
        message_count = 0
        max_messages = 100
        
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
                continue
            
            message_count += 1
            if message_count > max_messages:
                await websocket.send_json({
                    "type": "error",
                    "message": "Límite de mensajes alcanzado"
                })
                break
            
            result = await agent.process_message(
                session_id=session_id,
                message=message_data["message"],
                initial_state=current_state
            )
            
            current_state = result["state"]
            
            await websocket.send_json({
                "type": "message",
                "data": {
                    "response": result["response"],
                    "probabilidad": result["probability"],
                    "etapa": result["stage"],
                    "perfil": result["profile"],
                    "datos": result["extracted"],
                    "cerrada": result["closed"]
                }
            })
            
            if result["closed"]:
                await websocket.send_json({
                    "type": "close",
                    "data": {
                        "message": "Conversación finalizada. ¡Gracias!",
                        "probabilidad_final": result["probability"]
                    }
                })
                break
    
    except WebSocketDisconnect:
        logger.info(f"Cliente desconectado: {session_id}")
    except Exception as e:
        logger.error(f"Error en WebSocket {session_id}: {str(e)}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": "Error interno del servidor"
            })
        except:
            pass
    finally:
        ws_manager.disconnect(client_host)
        if db:
            await db.close()
        try:
            await websocket.close()
        except:
            pass


@router.get("/health")
async def chat_health(request: Request):
    host = request.headers.get("host", "localhost:8000")
    ws_url = f"ws://{host}/api/v1/chat/ws/{{session_id}}"
    
    if settings.APP_ENV == "production":
        protocol = "wss" if settings.USE_SSL else "ws"
        ws_url = f"{protocol}://{settings.DOMAIN}/api/v1/chat/ws/{{session_id}}"
    
    return {
        "status": "online",
        "endpoints": {
            "websocket": ws_url
        },
        "environment": settings.APP_ENV,
        "security": {
            "rate_limiting": True,
            "max_connections_per_ip": 3
        }
    }