import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.api.v1.router import api_router

settings = get_settings()
logger = logging.getLogger("gestao")


def seed_admin():
    """Cria o admin inicial se ADMIN_EMAIL estiver definido e o usuario nao existir."""
    email = os.getenv("ADMIN_EMAIL", "").strip()
    password = os.getenv("ADMIN_PASSWORD", "").strip()
    name = os.getenv("ADMIN_NAME", "Administrador")
    if not email or not password:
        return

    from app.models.models import User, UserRole
    from app.core.security import get_password_hash

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            logger.info(f"Admin {email} ja existe. Seed ignorado.")
            return
        admin = User(
            name=name, email=email,
            hashed_password=get_password_hash(password),
            role=UserRole.admin, is_active=True,
        )
        db.add(admin)
        db.commit()
        logger.info(f"Admin criado: {email}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Migracoes sao feitas pelo Alembic antes do uvicorn subir (ver Dockerfile CMD)
    seed_admin()
    yield


app = FastAPI(title=settings.BUSINESS_NAME, version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(api_router, prefix="/api/v1")


@app.get("/api/health")
def health():
    return {"status": "ok", "business": settings.BUSINESS_NAME}
