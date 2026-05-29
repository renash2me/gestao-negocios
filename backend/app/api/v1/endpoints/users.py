from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db
from app.models.models import User, UserRole
from app.core.security import get_password_hash
from app.api.v1.endpoints.auth import require_admin

router = APIRouter()


class UserIn(BaseModel):
    name: str
    email: str
    password: str
    role: str = "operador"


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool
    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    name: str
    email: str
    role: str = "operador"
    is_active: bool = True


@router.get("/", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.query(User).order_by(User.name).all()


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(data: UserIn, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email ja cadastrado")
    user = User(
        name=data.name,
        email=data.email,
        hashed_password=get_password_hash(data.password),
        role=UserRole(data.role),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int, data: UserUpdate,
    db: Session = Depends(get_db), _: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
    user.name = data.name
    user.email = data.email
    user.role = UserRole(data.role)
    user.is_active = data.is_active
    db.commit()
    db.refresh(user)
    return user
