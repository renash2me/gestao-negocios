from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.session import get_db
from app.models.models import Customer
from app.api.v1.endpoints.auth import get_current_user, require_admin
from app.models.models import User

router = APIRouter()


class CustomerIn(BaseModel):
    name: str
    phone: str | None = None
    location: str | None = None   # ex: "Ed. Villa Lobos"
    notes: str | None = None


class CustomerOut(BaseModel):
    id: int
    name: str
    phone: str | None
    location: str | None
    notes: str | None
    model_config = {"from_attributes": True}


@router.get("/", response_model=list[CustomerOut])
def list_customers(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Customer).order_by(Customer.name).all()


@router.post("/", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(data: CustomerIn, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    customer = Customer(**data.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: int, data: CustomerIn,
    db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente nao encontrado")
    for k, v in data.model_dump().items():
        setattr(customer, k, v)
    db.commit()
    db.refresh(customer)
    return customer
