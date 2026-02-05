"""
app/api/auth.py
Sistema de autenticación JWT con sesiones persistentes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import timedelta
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update

from app.services.database import get_db
from app.models import Usuario
from app.config import settings
from app.services.auth_service import auth_service

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    nombre_completo: str
    rol: str = 'vendedor'


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    nombre_completo: str
    rol: str
    activo: bool
    
    class Config:
        from_attributes = True


class ChangePasswordRequest(BaseModel):
    password_actual: str
    password_nueva: str


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = auth_service.decode_token(token)
        email: str = payload.get("sub")
        user_id: str = payload.get("user_id")
        
        if not email or not user_id:
            raise credentials_exception
            
    except ValueError:
        raise credentials_exception
    
    user = await auth_service.get_user_by_email(db, email=email)
    if not user or not user.activo:
        raise credentials_exception
    
    if not await auth_service.validate_session(db, user.id):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión expirada o inválida. Por favor inicia sesión nuevamente"
        )
    
    return user


async def get_current_active_user(
    current_user: Usuario = Depends(get_current_user)
) -> Usuario:
    if not current_user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )
    return current_user


def require_role(required_role: str):
    async def role_checker(current_user: Usuario = Depends(get_current_active_user)):
        if current_user.rol != required_role and current_user.rol != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Se requiere rol {required_role}"
            )
        return current_user
    return role_checker


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    if len(user.password) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña no puede exceder 72 caracteres"
        )
    
    existing = await auth_service.get_user_by_email(db, user.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )
    
    if user.rol not in ['admin', 'vendedor', 'viewer']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rol inválido"
        )
    
    new_user = Usuario(
        email=user.email,
        password_hash=auth_service.hash_password(user.password),
        nombre_completo=user.nombre_completo,
        rol=user.rol
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return UserResponse(
        id=str(new_user.id),
        email=new_user.email,
        nombre_completo=new_user.nombre_completo,
        rol=new_user.rol,
        activo=new_user.activo
    )


@router.post("/token", response_model=Token)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    client_ip = get_client_ip(request)
    
    user = await auth_service.authenticate_user(
        db, 
        form_data.username, 
        form_data.password,
        ip_address=client_ip
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_service.create_access_token(
        data={
            "sub": user.email,
            "user_id": str(user.id),
            "rol": user.rol
        },
        expires_delta=access_token_expires
    )
    
    await auth_service.create_session(db, user.id, access_token)
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/login", response_model=Token)
async def login_json(
    request: Request,
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    client_ip = get_client_ip(request)
    
    user = await auth_service.authenticate_user(
        db, 
        credentials.email, 
        credentials.password,
        ip_address=client_ip
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos"
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_service.create_access_token(
        data={
            "sub": user.email,
            "user_id": str(user.id),
            "rol": user.rol
        },
        expires_delta=access_token_expires
    )
    
    await auth_service.create_session(db, user.id, access_token)
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/logout")
async def logout(
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    await auth_service.revoke_user_sessions(db, current_user.id)
    return {"message": "Sesión cerrada exitosamente"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: Usuario = Depends(get_current_active_user)
):
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        nombre_completo=current_user.nombre_completo,
        rol=current_user.rol,
        activo=current_user.activo
    )


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    if len(request.password_nueva) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña no puede exceder 72 caracteres"
        )
    
    if not auth_service.verify_password(
        request.password_actual, 
        current_user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contraseña actual incorrecta"
        )
    
    await db.execute(
        update(Usuario)
        .where(Usuario.id == current_user.id)
        .values(password_hash=auth_service.hash_password(request.password_nueva))
    )
    
    await auth_service.revoke_user_sessions(db, current_user.id)
    await db.commit()
    
    return {"message": "Contraseña actualizada. Por favor inicia sesión nuevamente"}


@router.get("/verify-token")
async def verify_token(current_user: Usuario = Depends(get_current_active_user)):
    return {
        "valid": True,
        "user_id": str(current_user.id),
        "email": current_user.email,
        "rol": current_user.rol
    }