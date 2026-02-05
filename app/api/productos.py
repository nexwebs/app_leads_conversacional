"""
app/api/productos.py
Endpoints con generación directa (sin BackgroundTasks ni schedulers)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.services.database import get_db
from app.services.product_embeddings import generar_embedding_producto, eliminar_embedding_producto
from app.models import Producto, Paquete
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID


router = APIRouter()


class PaqueteCreate(BaseModel):
    nombre: str
    precio_mensual: float
    precio_anual: Optional[float] = None
    ideal_para: List[str] = []
    limites: dict = {}
    destacado: bool = False


class ProductoCreate(BaseModel):
    nombre: str
    slug: str
    descripcion_corta: str
    precio_base: float
    sectores: List[str] = []
    features: List[str] = []
    paquetes: List[PaqueteCreate] = []


class ProductoUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion_corta: Optional[str] = None
    precio_base: Optional[float] = None
    sectores: Optional[List[str]] = None
    features: Optional[List[str]] = None
    activo: Optional[bool] = None


@router.get("/")
async def listar_productos(
    activo: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener todos los productos con sus paquetes
    Endpoint público (sin autenticación)
    """
    try:
        # Obtener productos
        result = await db.execute(
            select(Producto)
            .where(Producto.activo == activo)
            .order_by(Producto.nombre)
        )
        productos = result.scalars().all()
        
        productos_data = []
        
        for producto in productos:
            # Obtener paquetes de cada producto
            result_paquetes = await db.execute(
                select(Paquete)
                .where(
                    Paquete.producto_id == producto.id,
                    Paquete.activo == True
                )
                .order_by(Paquete.precio_mensual)
            )
            paquetes = result_paquetes.scalars().all()
            
            productos_data.append({
                "id": str(producto.id),
                "nombre": producto.nombre,
                "slug": producto.slug,
                "descripcion_corta": producto.descripcion_corta,
                "precio_base": float(producto.precio_base),
                "sectores": producto.sectores or [],
                "features": producto.features or [],
                "paquetes": [
                    {
                        "id": str(paq.id),
                        "nombre": paq.nombre,
                        "slug": paq.slug,
                        "precio_mensual": float(paq.precio_mensual),
                        "precio_anual": float(paq.precio_anual) if paq.precio_anual else None,
                        "ideal_para": paq.ideal_para or [],
                        "limites": paq.limites or {},
                        "destacado": paq.destacado
                    }
                    for paq in paquetes
                ]
            })
        
        return {
            "total": len(productos_data),
            "productos": productos_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.post("/productos")
async def crear_producto(
    producto: ProductoCreate,
    db: AsyncSession = Depends(get_db)
):
    """Crea producto y genera embedding en la misma transacción"""
    try:
        result = await db.execute(
            text("""
                INSERT INTO productos 
                (nombre, slug, descripcion_corta, precio_base, sectores, features, activo)
                VALUES 
                (:nombre, :slug, :desc, :precio, :sectores, :features, TRUE)
                RETURNING id
            """),
            {
                "nombre": producto.nombre,
                "slug": producto.slug,
                "desc": producto.descripcion_corta,
                "precio": producto.precio_base,
                "sectores": producto.sectores,
                "features": producto.features
            }
        )
        
        producto_id = result.scalar()
        
        for paq in producto.paquetes:
            await db.execute(
                text("""
                    INSERT INTO paquetes 
                    (producto_id, nombre, slug, precio_mensual, precio_anual, 
                     ideal_para, limites, destacado, activo)
                    VALUES 
                    (:producto_id, :nombre, :slug, :precio_m, :precio_a, 
                     :ideal, :limites, :destacado, TRUE)
                """),
                {
                    "producto_id": producto_id,
                    "nombre": paq.nombre,
                    "slug": f"{producto.slug}-{paq.nombre.lower().replace(' ', '-')}",
                    "precio_m": paq.precio_mensual,
                    "precio_a": paq.precio_anual,
                    "ideal": paq.ideal_para,
                    "limites": paq.limites,
                    "destacado": paq.destacado
                }
            )
        
        embedding_ok = await generar_embedding_producto(db, str(producto_id))
        
        if not embedding_ok:
            await db.rollback()
            raise HTTPException(
                status_code=500, 
                detail="Producto creado pero fallo generación de embedding"
            )
        
        await db.commit()
        
        return {
            "success": True,
            "producto_id": str(producto_id),
            "mensaje": "Producto creado con embedding"
        }
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/productos/{producto_id}")
async def actualizar_producto(
    producto_id: UUID,
    producto: ProductoUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Actualiza producto y regenera embedding en la misma transacción"""
    try:
        updates = []
        params = {"producto_id": str(producto_id)}
        
        if producto.nombre is not None:
            updates.append("nombre = :nombre")
            params["nombre"] = producto.nombre
        
        if producto.descripcion_corta is not None:
            updates.append("descripcion_corta = :desc")
            params["desc"] = producto.descripcion_corta
        
        if producto.precio_base is not None:
            updates.append("precio_base = :precio")
            params["precio"] = producto.precio_base
        
        if producto.sectores is not None:
            updates.append("sectores = :sectores")
            params["sectores"] = producto.sectores
        
        if producto.features is not None:
            updates.append("features = :features")
            params["features"] = producto.features
        
        if producto.activo is not None:
            updates.append("activo = :activo")
            params["activo"] = producto.activo
        
        if not updates:
            raise HTTPException(status_code=400, detail="No hay campos para actualizar")
        
        query = f"""
            UPDATE productos 
            SET {', '.join(updates)}
            WHERE id = :producto_id
        """
        
        await db.execute(text(query), params)
        
        embedding_ok = await generar_embedding_producto(db, str(producto_id))
        
        if not embedding_ok:
            await db.rollback()
            raise HTTPException(
                status_code=500,
                detail="Producto actualizado pero fallo regeneración de embedding"
            )
        
        await db.commit()
        
        return {
            "success": True,
            "mensaje": "Producto actualizado con embedding"
        }
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/productos/{producto_id}")
async def eliminar_producto(
    producto_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Elimina producto y su embedding en la misma transacción"""
    try:
        result = await db.execute(
            text("SELECT id FROM productos WHERE id = :id"),
            {"id": str(producto_id)}
        )
        producto_existe = result.scalar()
        
        if not producto_existe:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        
        await eliminar_embedding_producto(db, str(producto_id))
        
        await db.execute(
            text("DELETE FROM productos WHERE id = :id"),
            {"id": str(producto_id)}
        )
        
        await db.commit()
        
        return {
            "success": True,
            "mensaje": "Producto y embedding eliminados"
        }
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/paquetes/{producto_id}")
async def agregar_paquete(
    producto_id: UUID,
    paquete: PaqueteCreate,
    db: AsyncSession = Depends(get_db)
):
    """Agrega paquete y regenera embedding del producto en la misma transacción"""
    try:
        result = await db.execute(
            text("SELECT slug FROM productos WHERE id = :id"),
            {"id": str(producto_id)}
        )
        producto_slug = result.scalar()
        
        if not producto_slug:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        
        await db.execute(
            text("""
                INSERT INTO paquetes 
                (producto_id, nombre, slug, precio_mensual, precio_anual, 
                 ideal_para, limites, destacado, activo)
                VALUES 
                (:producto_id, :nombre, :slug, :precio_m, :precio_a, 
                 :ideal, :limites, :destacado, TRUE)
            """),
            {
                "producto_id": str(producto_id),
                "nombre": paquete.nombre,
                "slug": f"{producto_slug}-{paquete.nombre.lower().replace(' ', '-')}",
                "precio_m": paquete.precio_mensual,
                "precio_a": paquete.precio_anual,
                "ideal": paquete.ideal_para,
                "limites": paquete.limites,
                "destacado": paquete.destacado
            }
        )
        
        embedding_ok = await generar_embedding_producto(db, str(producto_id))
        
        if not embedding_ok:
            await db.rollback()
            raise HTTPException(
                status_code=500,
                detail="Paquete agregado pero fallo regeneración de embedding"
            )
        
        await db.commit()
        
        return {
            "success": True,
            "mensaje": "Paquete agregado con embedding actualizado"
        }
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

