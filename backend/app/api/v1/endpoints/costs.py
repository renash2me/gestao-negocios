from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db
from app.models.models import Ingredient, IngredientPriceHistory, CardMachine, ElectricityBill
from app.api.v1.endpoints.auth import get_current_user, require_admin
from app.models.models import User

router = APIRouter()


# ---------------------------------------------------------------------------
# Insumos
# ---------------------------------------------------------------------------

class IngredientIn(BaseModel):
    name: str
    unit: str


class IngredientPriceIn(BaseModel):
    package_price: Decimal       # preco pago na embalagem inteira
    package_weight: Decimal      # peso da embalagem na unidade do insumo
    supplier: str | None = None


class IngredientOut(BaseModel):
    id: int
    name: str
    unit: str
    avg_price_per_unit: Decimal
    last_price_per_unit: Decimal
    last_supplier: str | None
    is_active: bool
    model_config = {"from_attributes": True}


@router.get("/ingredients", response_model=list[IngredientOut])
def list_ingredients(
    active_only: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Ingredient).order_by(Ingredient.name)
    if active_only:
        q = q.filter(Ingredient.is_active == True)
    return q.all()


@router.post("/ingredients", response_model=IngredientOut, status_code=status.HTTP_201_CREATED)
def create_ingredient(data: IngredientIn, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    ing = Ingredient(**data.model_dump())
    db.add(ing)
    db.commit()
    db.refresh(ing)
    return ing


@router.patch("/ingredients/{ingredient_id}/toggle", response_model=IngredientOut)
def toggle_ingredient(
    ingredient_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    ing = db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()
    if not ing:
        raise HTTPException(status_code=404, detail="Insumo nao encontrado")
    ing.is_active = not ing.is_active
    db.commit()
    db.refresh(ing)
    return ing


@router.post("/ingredients/{ingredient_id}/price", response_model=IngredientOut)
def register_price(
    ingredient_id: int,
    data: IngredientPriceIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Registra preco a partir do valor da embalagem e peso. Calcula preco por unidade."""
    ing = db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()
    if not ing:
        raise HTTPException(status_code=404, detail="Insumo nao encontrado")

    if data.package_weight <= 0:
        raise HTTPException(status_code=400, detail="Peso deve ser maior que zero")

    price_per_unit = (data.package_price / data.package_weight).quantize(Decimal("0.0001"))

    db.add(IngredientPriceHistory(
        ingredient_id=ingredient_id,
        price_per_unit=price_per_unit,
        package_price=data.package_price,
        package_weight=data.package_weight,
        supplier=data.supplier,
    ))
    db.flush()

    # Recalcula media
    history = db.query(IngredientPriceHistory).filter(
        IngredientPriceHistory.ingredient_id == ingredient_id
    ).all()
    avg = sum(h.price_per_unit for h in history) / len(history)

    ing.avg_price_per_unit = avg.quantize(Decimal("0.0001"))
    ing.last_price_per_unit = price_per_unit
    ing.last_supplier = data.supplier

    db.commit()
    db.refresh(ing)
    return ing


# ---------------------------------------------------------------------------
# Maquininhas
# ---------------------------------------------------------------------------

class CardMachineIn(BaseModel):
    name: str
    debit_fee_percent: Decimal = Decimal("1.5")
    credit_fee_percent: Decimal = Decimal("3.0")


class CardMachineOut(BaseModel):
    id: int
    name: str
    debit_fee_percent: Decimal
    credit_fee_percent: Decimal
    is_active: bool
    model_config = {"from_attributes": True}


@router.get("/card-machines", response_model=list[CardMachineOut])
def list_card_machines(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(CardMachine).filter(CardMachine.is_active == True).all()


@router.post("/card-machines", response_model=CardMachineOut, status_code=status.HTTP_201_CREATED)
def create_card_machine(data: CardMachineIn, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    machine = CardMachine(**data.model_dump())
    db.add(machine)
    db.commit()
    db.refresh(machine)
    return machine


# ---------------------------------------------------------------------------
# Conta de Luz
# ---------------------------------------------------------------------------

class ElectricityBillIn(BaseModel):
    reference_month: str   # "2025-01"
    kwh_consumed: Decimal
    kwh_rate: Decimal
    notes: str | None = None


class ElectricityBillOut(BaseModel):
    id: int
    reference_month: str
    kwh_consumed: Decimal
    kwh_rate: Decimal
    total_cost: Decimal
    notes: str | None
    model_config = {"from_attributes": True}


@router.get("/electricity", response_model=list[ElectricityBillOut])
def list_electricity(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.query(ElectricityBill).order_by(ElectricityBill.reference_month.desc()).all()


@router.post("/electricity", response_model=ElectricityBillOut, status_code=status.HTTP_201_CREATED)
def register_electricity(
    data: ElectricityBillIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    total = (data.kwh_consumed * data.kwh_rate).quantize(Decimal("0.01"))
    bill = ElectricityBill(
        reference_month=data.reference_month,
        kwh_consumed=data.kwh_consumed,
        kwh_rate=data.kwh_rate,
        total_cost=total,
        notes=data.notes,
    )
    db.add(bill)
    db.commit()
    db.refresh(bill)
    return bill
