"""
app/tools/email_tools.py
Envío de emails con templates mejorados
"""
from app.services.email_service import EmailService
from app.config import settings
from typing import Dict, Any

email_service = EmailService()

async def send_lead_notification(
    lead_data: Dict[str, Any],
    probabilidad: int
) -> bool:
    """Notifica al vendedor - FUNCIONA CORRECTAMENTE"""
    try:
        nombre = lead_data.get('nombre', 'Sin nombre')
        email = lead_data.get('email', 'No disponible')
        telefono = lead_data.get('telefono', 'No disponible')
        empresa = lead_data.get('empresa', 'No especificada')
        sector = lead_data.get('sector', 'General')
        presupuesto = lead_data.get('presupuesto')
        
        if probabilidad >= 70:
            clasificacion = "🔥 LEAD CALIENTE"
            color = "#dc3545"
        elif probabilidad >= 40:
            clasificacion = "🟡 LEAD TIBIO"
            color = "#ffc107"
        else:
            clasificacion = "🔵 LEAD FRÍO"
            color = "#17a2b8"
        
        subject = f"{clasificacion}: {nombre} - {probabilidad}%"
        
        datos_html = f"""
        <tr><td><strong>Nombre:</strong></td><td>{nombre}</td></tr>
        <tr><td><strong>Email:</strong></td><td>{email}</td></tr>
        <tr><td><strong>Teléfono:</strong></td><td>{telefono}</td></tr>
        <tr><td><strong>Empresa:</strong></td><td>{empresa}</td></tr>
        <tr><td><strong>Sector:</strong></td><td>{sector}</td></tr>
        """
        
        if presupuesto:
            datos_html += f"<tr><td><strong>Presupuesto:</strong></td><td>S/ {presupuesto}</td></tr>"
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: {color}; color: white; padding: 25px; text-align: center;">
                <h1>{clasificacion}</h1>
                <p>Probabilidad: <strong>{probabilidad}%</strong></p>
            </div>
            <div style="background: white; padding: 30px;">
                <h2>Información del Lead</h2>
                <table style="width: 100%;">
                    {datos_html}
                </table>
                <p style="margin-top: 20px;">
                    <strong>Acción sugerida:</strong> 
                    {"Contactar inmediatamente" if probabilidad >= 70 else "Seguimiento en 24h" if probabilidad >= 40 else "Revisar y planificar"}
                </p>
            </div>
        </body>
        </html>
        """
        
        result = await email_service._enviar_email(
            destinatario=settings.EMAIL_VENTAS,
            subject=subject,
            body=body
        )
        
        return result
        
    except Exception as e:
        print(f"❌ Error enviando email vendedor: {e}")
        return False

async def send_client_card(
    email_cliente: str,
    nombre_cliente: str = None
) -> bool:
    """Envía tarjeta al cliente"""
    try:
        nombre = nombre_cliente or "amigo"
        subject = f"Gracias por tu interés - {settings.NOMBRE_EMPRESA}"
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 40px; text-align: center;">
                <h1>{settings.NOMBRE_EMPRESA}</h1>
            </div>
            <div style="padding: 30px;">
                <h2>Hola {nombre} 👋</h2>
                <p>Gracias por tu interés. Nos pondremos en contacto pronto.</p>
                <h3>📞 Contacto</h3>
                <p>🌐 Web: {settings.SITIO_WEB}</p>
                <p>📱 WhatsApp: {settings.TELEFONO_SOPORTE}</p>
                <p>✉️ Email: {settings.EMAIL_SOPORTE}</p>
            </div>
        </body>
        </html>
        """
        
        result = await email_service._enviar_email(
            destinatario=email_cliente,
            subject=subject,
            body=body
        )
        
        return result
        
    except Exception as e:
        print(f"❌ Error enviando email cliente: {e}")
        return False