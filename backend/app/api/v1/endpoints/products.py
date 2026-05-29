from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from pydantic import BaseModel

from app.db.session import get_db
from app.models.models import Product, RecipeItem, Ingredient
from app.api.v1.endpoints.auth import get_current_user, require_admin
from app.models.models import User

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class RecipeItemIn(BaseModel):
    ingredient_id: int
    quantity: Decimal


class ProductIn(BaseModel):
    name: str
    description: str | None = None
    sale_price: Decimal
    prep_time_minutes: int = 0
    recipe: list[RecipeItemIn] = []


class RecipeItemOut(BaseModel):
    ingredient_id: int
    ingredient_name: str
    unit: str
    quantity: Decimal
    unit_cost: Decimal
    line_cost: Decimal

    model_config = {"from_attributes": True}


class ProductOut(BaseModel):
    id: int
    name: str
    description: str | None
    sale_price: Decimal
    prep_time_minutes: int
    is_active: bool
    ingredient_cost: Decimal = Decimal("0")
    recipe: list[RecipeItemOut] = []

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def calc_ingredient_cost(product: Product) -> Decimal:
    total = Decimal("0")
    for item in product.recipe_items:
        total += item.quantity * item.ingredient.avg_price_per_unit
    return total.quantize(Decimal("0.01"))


def build_product_out(product: Product) -> ProductOut:
    recipe_out = []
    for item in product.recipe_items:
        unit_cost = item.ingredient.avg_price_per_unit
        recipe_out.append(RecipeItemOut(
            ingredient_id=item.ingredient_id,
            ingredient_name=item.ingredient.name,
            unit=item.ingredient.unit,
            quantity=item.quantity,
            unit_cost=unit_cost,
            line_cost=(item.quantity * unit_cost).quantize(Decimal("0.0001")),
        ))
    return ProductOut(
        id=product.id,
        name=product.name,
        description=product.description,
        sale_price=product.sale_price,
        prep_time_minutes=product.prep_time_minutes,
        is_active=product.is_active,
        ingredient_cost=calc_ingredient_cost(product),
        recipe=recipe_out,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/", response_model=list[ProductOut])
def list_products(
    active_only: bool = True,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Product).options(
        selectinload(Product.recipe_items).selectinload(RecipeItem.ingredient)
    )
    if active_only:
        q = q.filter(Product.is_active == True)
    return [build_product_out(p) for p in q.all()]


@router.get("/{product_id}", response_model=ProductOut)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    product = db.query(Product).options(
        selectinload(Product.recipe_items).selectinload(RecipeItem.ingredient)
    ).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return build_product_out(product)


@router.post("/", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    data: ProductIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    product = Product(
        name=data.name,
        description=data.description,
        sale_price=data.sale_price,
        prep_time_minutes=data.prep_time_minutes,
    )
    db.add(product)
    db.flush()

    for item in data.recipe:
        ing = db.query(Ingredient).filter(Ingredient.id == item.ingredient_id).first()
        if not ing:
            raise HTTPException(status_code=404, detail=f"Insumo {item.ingredient_id} não encontrado")
        db.add(RecipeItem(product_id=product.id, ingredient_id=item.ingredient_id, quantity=item.quantity))

    db.commit()
    db.refresh(product)
    return build_product_out(product)


@router.put("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    data: ProductIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    product.name = data.name
    product.description = data.description
    product.sale_price = data.sale_price
    product.prep_time_minutes = data.prep_time_minutes

    # Recria ficha técnica
    db.query(RecipeItem).filter(RecipeItem.product_id == product_id).delete()
    for item in data.recipe:
        db.add(RecipeItem(product_id=product_id, ingredient_id=item.ingredient_id, quantity=item.quantity))

    db.commit()
    db.refresh(product)
    return build_product_out(product)


@router.patch("/{product_id}/toggle", response_model=ProductOut)
def toggle_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    product = db.query(Product).options(
        selectinload(Product.recipe_items).selectinload(RecipeItem.ingredient)
    ).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto nao encontrado")
    product.is_active = not product.is_active
    db.commit()
    db.refresh(product)
    return build_product_out(product)
