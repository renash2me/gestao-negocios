from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from pydantic import BaseModel

from app.db.session import get_db
from app.models.models import Product, Recipe, RecipeItem, SaleItem
from app.api.v1.endpoints.auth import get_current_user, require_admin
from app.models.models import User

router = APIRouter()


class ProductIn(BaseModel):
    name: str
    description: str | None = None
    sale_price: Decimal
    recipe_id: int | None = None
    units_per_batch: int = 1


class ProductOut(BaseModel):
    id: int
    name: str
    description: str | None
    sale_price: Decimal
    recipe_id: int | None
    recipe_name: str | None
    units_per_batch: int
    unit_cost: Decimal
    margin_percent: Decimal
    is_active: bool

    model_config = {"from_attributes": True}


def calc_product_cost(product: Product, db: Session) -> Decimal:
    """Custo do produto = custo da receita / rendimento * unidades."""
    if not product.recipe_id:
        return Decimal("0")
    recipe = db.query(Recipe).options(
        selectinload(Recipe.items).selectinload(RecipeItem.ingredient)
    ).filter(Recipe.id == product.recipe_id).first()
    if not recipe or recipe.yield_units == 0:
        return Decimal("0")
    total = sum(
        item.quantity * item.ingredient.avg_price_per_unit
        for item in recipe.items
    )
    cost_per_unit = total / recipe.yield_units
    return (cost_per_unit * product.units_per_batch).quantize(Decimal("0.01"))


def build_product_out(product: Product, db: Session) -> ProductOut:
    unit_cost = calc_product_cost(product, db)
    margin = Decimal("0")
    if product.sale_price > 0:
        margin = ((product.sale_price - unit_cost) / product.sale_price * 100).quantize(Decimal("0.1"))
    return ProductOut(
        id=product.id,
        name=product.name,
        description=product.description,
        sale_price=product.sale_price,
        recipe_id=product.recipe_id,
        recipe_name=product.recipe.name if product.recipe else None,
        units_per_batch=product.units_per_batch,
        unit_cost=unit_cost,
        margin_percent=margin,
        is_active=product.is_active,
    )


@router.get("/", response_model=list[ProductOut])
def list_products(
    active_only: bool = True,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Product).options(selectinload(Product.recipe))
    if active_only:
        q = q.filter(Product.is_active == True)
    return [build_product_out(p, db) for p in q.order_by(Product.name).all()]


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    product = db.query(Product).options(selectinload(Product.recipe)).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto nao encontrado")
    return build_product_out(product, db)


@router.post("/", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(data: ProductIn, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    if data.recipe_id:
        recipe = db.query(Recipe).filter(Recipe.id == data.recipe_id).first()
        if not recipe:
            raise HTTPException(status_code=404, detail="Receita nao encontrada")
    product = Product(**data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return build_product_out(
        db.query(Product).options(selectinload(Product.recipe)).filter(Product.id == product.id).first(), db
    )


@router.put("/{product_id}", response_model=ProductOut)
def update_product(product_id: int, data: ProductIn, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto nao encontrado")
    for k, v in data.model_dump().items():
        setattr(product, k, v)
    db.commit()
    return build_product_out(
        db.query(Product).options(selectinload(Product.recipe)).filter(Product.id == product_id).first(), db
    )


@router.patch("/{product_id}/toggle", response_model=ProductOut)
def toggle_product(product_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    product = db.query(Product).options(selectinload(Product.recipe)).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto nao encontrado")
    product.is_active = not product.is_active
    db.commit()
    db.refresh(product)
    return build_product_out(product, db)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto nao encontrado")
    has_sales = db.query(SaleItem).filter(SaleItem.product_id == product_id).first()
    if has_sales:
        raise HTTPException(status_code=400, detail="Produto possui vendas. Desative-o em vez de excluir.")
    db.delete(product)
    db.commit()
