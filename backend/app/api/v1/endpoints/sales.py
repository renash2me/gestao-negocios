from decimal import Decimal
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from pydantic import BaseModel

from app.db.session import get_db
from app.models.models import Sale, SaleItem, Product, CardMachine, RecipeItem, Ingredient, PaymentMethod, SaleStatus
from app.api.v1.endpoints.auth import get_current_user, require_admin
from app.models.models import User

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class SaleItemIn(BaseModel):
    product_id: int
    quantity: int


class SaleIn(BaseModel):
    client_ref: str | None = None          # UUID gerado pelo PWA (idempotência offline)
    customer_id: int | None = None
    payment_method: PaymentMethod
    card_machine_id: int | None = None
    items: list[SaleItemIn]
    notes: str | None = None
    sold_at: datetime | None = None        # permite registrar horário real da venda offline


class SaleItemOut(BaseModel):
    product_id: int
    product_name: str
    quantity: int
    unit_price: Decimal
    unit_cost: Decimal
    line_total: Decimal


class SaleOut(BaseModel):
    id: int
    client_ref: str | None
    operator_name: str
    customer_name: str | None
    payment_method: str
    card_machine_name: str | None
    subtotal: Decimal
    card_fee_amount: Decimal
    total_cost: Decimal
    gross_profit: Decimal
    profit_margin: Decimal
    status: str
    notes: str | None
    sold_at: datetime
    items: list[SaleItemOut]


class SalePreviewIn(BaseModel):
    """Calcula lucro em tempo real antes de confirmar — usado pelo PDV."""
    payment_method: PaymentMethod
    card_machine_id: int | None = None
    items: list[SaleItemIn]


class SalePreviewOut(BaseModel):
    subtotal: Decimal
    card_fee_amount: Decimal
    ingredient_cost: Decimal
    gross_profit: Decimal
    profit_margin: Decimal
    items_detail: list[dict]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_card_fee(payment_method: PaymentMethod, machine: CardMachine | None) -> Decimal:
    if payment_method == PaymentMethod.credito and machine:
        return machine.credit_fee_percent / 100
    if payment_method == PaymentMethod.debito and machine:
        return machine.debit_fee_percent / 100
    return Decimal("0")


def calc_product_cost(product: Product, db: Session) -> Decimal:
    total = Decimal("0")
    items = db.query(RecipeItem).options(
        selectinload(RecipeItem.ingredient)
    ).filter(RecipeItem.product_id == product.id).all()
    for item in items:
        total += item.quantity * item.ingredient.avg_price_per_unit
    return total.quantize(Decimal("0.0001"))


def build_sale_out(sale: Sale) -> SaleOut:
    return SaleOut(
        id=sale.id,
        client_ref=sale.client_ref,
        operator_name=sale.operator.name,
        customer_name=sale.customer.name if sale.customer else None,
        payment_method=sale.payment_method,
        card_machine_name=sale.card_machine.name if sale.card_machine else None,
        subtotal=sale.subtotal,
        card_fee_amount=sale.card_fee_amount,
        total_cost=sale.total_cost,
        gross_profit=sale.gross_profit,
        profit_margin=sale.profit_margin,
        status=sale.status,
        notes=sale.notes,
        sold_at=sale.sold_at,
        items=[
            SaleItemOut(
                product_id=i.product_id,
                product_name=i.product.name,
                quantity=i.quantity,
                unit_price=i.unit_price,
                unit_cost=i.unit_cost,
                line_total=i.line_total,
            )
            for i in sale.items
        ],
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/preview", response_model=SalePreviewOut)
def preview_sale(
    data: SalePreviewIn,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Calcula lucro em tempo real. Chamado pelo PDV antes de confirmar."""
    machine = None
    if data.card_machine_id:
        machine = db.query(CardMachine).filter(CardMachine.id == data.card_machine_id).first()

    fee_rate = get_card_fee(data.payment_method, machine)
    subtotal = Decimal("0")
    ingredient_cost = Decimal("0")
    items_detail = []

    for item_in in data.items:
        product = db.query(Product).filter(Product.id == item_in.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Produto {item_in.product_id} não encontrado")
        unit_cost = calc_product_cost(product, db)
        line = product.sale_price * item_in.quantity
        subtotal += line
        ingredient_cost += unit_cost * item_in.quantity
        items_detail.append({
            "product_id": product.id,
            "name": product.name,
            "quantity": item_in.quantity,
            "unit_price": float(product.sale_price),
            "unit_cost": float(unit_cost),
            "line_total": float(line),
        })

    card_fee_amount = (subtotal * fee_rate).quantize(Decimal("0.01"))
    total_cost = (ingredient_cost + card_fee_amount).quantize(Decimal("0.01"))
    gross_profit = (subtotal - total_cost).quantize(Decimal("0.01"))
    profit_margin = (gross_profit / subtotal * 100).quantize(Decimal("0.01")) if subtotal else Decimal("0")

    return SalePreviewOut(
        subtotal=subtotal,
        card_fee_amount=card_fee_amount,
        ingredient_cost=ingredient_cost,
        gross_profit=gross_profit,
        profit_margin=profit_margin,
        items_detail=items_detail,
    )


@router.post("/", response_model=SaleOut, status_code=status.HTTP_201_CREATED)
def create_sale(
    data: SaleIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Idempotência: se client_ref já existe, retorna a venda existente
    if data.client_ref:
        existing = db.query(Sale).filter(Sale.client_ref == data.client_ref).first()
        if existing:
            db.refresh(existing)
            return build_sale_out(existing)

    machine = None
    if data.card_machine_id:
        machine = db.query(CardMachine).filter(CardMachine.id == data.card_machine_id).first()

    fee_rate = get_card_fee(data.payment_method, machine)
    subtotal = Decimal("0")
    ingredient_cost = Decimal("0")
    sale_items = []

    for item_in in data.items:
        product = db.query(Product).filter(Product.id == item_in.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Produto {item_in.product_id} não encontrado")
        unit_cost = calc_product_cost(product, db)
        line = product.sale_price * item_in.quantity
        subtotal += line
        ingredient_cost += unit_cost * item_in.quantity
        sale_items.append(SaleItem(
            product_id=product.id,
            quantity=item_in.quantity,
            unit_price=product.sale_price,
            unit_cost=unit_cost,
            line_total=line,
        ))

    card_fee_amount = (subtotal * fee_rate).quantize(Decimal("0.01"))
    total_cost = (ingredient_cost + card_fee_amount).quantize(Decimal("0.01"))
    gross_profit = (subtotal - total_cost).quantize(Decimal("0.01"))
    profit_margin = (gross_profit / subtotal * 100).quantize(Decimal("0.01")) if subtotal else Decimal("0")

    sale = Sale(
        client_ref=data.client_ref,
        operator_id=current_user.id,
        customer_id=data.customer_id,
        payment_method=data.payment_method,
        card_machine_id=data.card_machine_id,
        subtotal=subtotal,
        card_fee_amount=card_fee_amount,
        total_cost=total_cost,
        gross_profit=gross_profit,
        profit_margin=profit_margin,
        notes=data.notes,
        sold_at=data.sold_at or datetime.utcnow(),
    )
    db.add(sale)
    db.flush()
    for si in sale_items:
        si.sale_id = sale.id
        db.add(si)
    db.commit()

    sale = db.query(Sale).options(
        selectinload(Sale.items).selectinload(SaleItem.product),
        selectinload(Sale.operator),
        selectinload(Sale.customer),
        selectinload(Sale.card_machine),
    ).filter(Sale.id == sale.id).first()

    return build_sale_out(sale)


@router.get("/", response_model=list[SaleOut])
def list_sales(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    sales = db.query(Sale).options(
        selectinload(Sale.items).selectinload(SaleItem.product),
        selectinload(Sale.operator),
        selectinload(Sale.customer),
        selectinload(Sale.card_machine),
    ).order_by(Sale.sold_at.desc()).offset(offset).limit(limit).all()
    return [build_sale_out(s) for s in sales]
