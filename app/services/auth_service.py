from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
import uuid
import hashlib
import time
import logging

from app.models import Usuario, Sesion
from app.config import settings

logger = logging.getLogger(__name__)


class AuthService:
    ALGORITHM = "HS256"
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        if not plain_password or not hashed_password:
            return False
        
        try:
            return bcrypt.checkpw(
                plain_password[:72].encode('utf-8'),
                hashed_password.encode('utf-8')
            )
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False
    
    @staticmethod
    def hash_password(password: str) -> str:
        if not password:
            raise ValueError("La contraseña no puede estar vacía")
        
        if len(password) > 72:
            raise ValueError("La contraseña no puede exceder 72 caracteres")
        
        return bcrypt.hashpw(
            password.encode('utf-8'),
            bcrypt.gensalt(rounds=12)
        ).decode('utf-8')
    
    @staticmethod
    def create_access_token(
        data: dict,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + (
            expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "type": "access"
        })
        
        return jwt.encode(
            to_encode,
            settings.SECRET_KEY,
            algorithm=AuthService.ALGORITHM
        )
    
    @staticmethod
    def decode_token(token: str) -> dict:
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[AuthService.ALGORITHM],
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_iat": True,
                    "require_exp": True
                }
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise ValueError("Token expirado")
        except jwt.InvalidTokenError:
            raise ValueError("Token inválido")
    
    @staticmethod
    def generate_token_hash(token: str) -> str:
        unique_string = f"{token}:{time.time_ns()}:{uuid.uuid4()}"
        return hashlib.sha256(unique_string.encode()).hexdigest()
    
    async def get_user_by_email(
        self,
        db: AsyncSession,
        email: str
    ) -> Optional[Usuario]:
        result = await db.execute(
            select(Usuario).where(Usuario.email == email)
        )
        return result.scalar_one_or_none()
    
    async def authenticate_user(
        self,
        db: AsyncSession,
        email: str,
        password: str,
        ip_address: Optional[str] = None
    ) -> Optional[Usuario]:
        user = await self.get_user_by_email(db, email)
        
        if not user:
            logger.info(f"Login attempt for non-existent user: {email}")
            return None
        
        if not user.activo:
            logger.warning(f"Login attempt for inactive user: {email}")
            return None
        
        if not self.verify_password(password, user.password_hash):
            logger.info(f"Failed login for {user.email} from {ip_address or 'unknown'}")
            return None
        
        logger.info(f"Successful login for {user.email} from {ip_address or 'unknown'}")
        return user
    
    async def create_session(
        self,
        db: AsyncSession,
        usuario_id: uuid.UUID,
        token: str
    ) -> Sesion:
        token_hash = self.generate_token_hash(token)
        
        expira_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        
        sesion = Sesion(
            usuario_id=usuario_id,
            token_hash=token_hash,
            expira_at=expira_at
        )
        db.add(sesion)
        await db.commit()
        await db.refresh(sesion)
        return sesion
    
    async def validate_session(
        self,
        db: AsyncSession,
        user_id: uuid.UUID
    ) -> bool:
        result = await db.execute(
            select(Sesion).where(
                Sesion.usuario_id == user_id,
                Sesion.expira_at > datetime.now(timezone.utc),
                Sesion.revocado == False
            ).order_by(Sesion.created_at.desc()).limit(1)
        )
        return result.scalar_one_or_none() is not None
    
    async def revoke_user_sessions(
        self,
        db: AsyncSession,
        user_id: uuid.UUID
    ):
        await db.execute(
            update(Sesion)
            .where(Sesion.usuario_id == user_id, Sesion.revocado == False)
            .values(revocado=True)
        )
        await db.commit()
        logger.info(f"Revoked all sessions for user {user_id}")


auth_service = AuthService()