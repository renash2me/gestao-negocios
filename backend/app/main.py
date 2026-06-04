import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import get_settings
from app.db.session import engine, Base, SessionLocal
from app.api.v1.router import api_router

settings = get_settings()
logger = logging.getLogger("gestao")


def run_migrations():
    """Migracoes incrementais via ALTER TABLE IF NOT EXISTS — sempre seguro rodar."""
    migrations = [
        # Colunas adicionadas ao longo do desenvolvimento
        "ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
        "ALTER TABLE customers ADD COLUMN IF NOT EXISTS location VARCHAR(200)",
        "ALTER TABLE ingredient_price_history ADD COLUMN IF NOT EXISTS package_price NUMERIC(10,2)",
        "ALTER TABLE ingredient_price_history ADD COLUMN IF NOT EXISTS package_weight NUMERIC(10,4)",
        # Modelo Recipe separado de Product
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS recipe_id INTEGER REFERENCES recipes(id)",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS units_per_batch INTEGER DEFAULT 1",
    ]
    db = SessionLocal()
    try:
        for sql in migrations:
            try:
                db.execute(text(sql))
            except Exception as e:
                logger.debug(f"Migracao ignorada (esperado se ja existe): {e}")
        db.commit()
        logger.info("Migracoes executadas com sucesso")
    except Exception as e:
        db.rollback()
        logger.error(f"Erro na migracao: {e}")
    finally:
        db.close()


def seed_admin():
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
            return
        admin = User(name=name, email=email, hashed_password=get_password_hash(password), role=UserRole.admin, is_active=True)
        db.add(admin)
        db.commit()
        logger.info(f"Admin criado: {email}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # create_all cria tabelas novas (recipes, etc) se nao existirem
    Base.metadata.create_all(bind=engine)
    # run_migrations adiciona colunas em tabelas existentes
    run_migrations()
    seed_admin()
    yield


app = FastAPI(title=settings.BUSINESS_NAME, version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(api_router, prefix="/api/v1")


@app.get("/api/health")
def health():
    return {"status": "ok", "business": settings.BUSINESS_NAME}
