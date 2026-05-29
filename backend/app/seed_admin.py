"""
Cria o primeiro usuário admin. Rodar uma vez após subir a stack:

    docker compose -f gestao-flores-doces.yml exec backend python -m app.seed_admin

As credenciais vêm das variáveis de ambiente ADMIN_EMAIL e ADMIN_PASSWORD,
ou são pedidas interativamente.
"""
import os
import sys

from app.db.session import SessionLocal, engine, Base
from app.models.models import User, UserRole
from app.core.security import get_password_hash


def main():
    # Garante que as tabelas existem
    Base.metadata.create_all(bind=engine)

    email = os.getenv("ADMIN_EMAIL")
    password = os.getenv("ADMIN_PASSWORD")
    name = os.getenv("ADMIN_NAME", "Administrador")

    if not email or not password:
        print("Defina ADMIN_EMAIL e ADMIN_PASSWORD nas variáveis de ambiente.")
        sys.exit(1)

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"Usuário {email} já existe. Nada a fazer.")
            return

        admin = User(
            name=name,
            email=email,
            hashed_password=get_password_hash(password),
            role=UserRole.admin,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print(f"Admin criado: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
