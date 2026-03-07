"""
app/api/public.py
Endpoints con generación directa (sin BackgroundTasks ni schedulers)
"""

from fastapi import APIRouter
from fastapi.responses import Response

router = APIRouter()


@router.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(
        content=b"",
        media_type="image/x-icon",
        status_code=204,
        headers={"Cache-Control": "public, max-age=3600"},
    )
