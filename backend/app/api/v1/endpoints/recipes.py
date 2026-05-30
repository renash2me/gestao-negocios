from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from pydantic import BaseModel

from app.db.session import get_db
from app.models.models import Recipe, RecipeItem, Ingredient, Product
from app.api.v1.endpoints.auth import get_current_user, require_admin
from app.models.models import User

router = APIRouter()


class RecipeItemIn(BaseModel):
    ingredient_id: int
    quantity: Decimal


class RecipeIn(BaseModel):
    name: str
    description: str | None = None
    prep_time_minutes: int = 0
    yield_units: int = 1
    items: list[RecipeItemIn] = []


class RecipeItemOut(BaseModel):
    ingredient_id: int
    ingredient_name: str
    unit: str
    quantity: Decimal
    unit_cost: Decimal
    line_cost: Decimal


class RecipeOut(BaseModel):
    id: int
    name: str
    description: str | None
    prep_time_minutes: int
    yield_units: int
    is_active: bool
    total_cost: Decimal
    cost_per_unit: Decimal
    items: list[RecipeItemOut]

    model_config = {"from_attributes": True}


def build_recipe_out(recipe: Recipe) -> RecipeOut:
    total = Decimal("0")
    items_out = []
    for item in recipe.items:
        unit_cost = item.ingredient.avg_price_per_unit
        line = (item.quantity * unit_cost).quantize(Decimal("0.0001"))
        total += line
        items_out.append(RecipeItemOut(
            ingredient_id=item.ingredient_id,
            ingredient_name=item.ingredient.name,
            unit=item.ingredient.unit,
            quantity=item.quantity,
            unit_cost=unit_cost,
            line_cost=line,
        ))
    cost_per_unit = (total / recipe.yield_units).quantize(Decimal("0.0001")) if recipe.yield_units > 0 else Decimal("0")
    return RecipeOut(
        id=recipe.id,
        name=recipe.name,
        description=recipe.description,
        prep_time_minutes=recipe.prep_time_minutes,
        yield_units=recipe.yield_units,
        is_active=recipe.is_active,
        total_cost=total.quantize(Decimal("0.01")),
        cost_per_unit=cost_per_unit,
        items=items_out,
    )


def _load_recipe(recipe_id: int, db: Session) -> Recipe:
    recipe = db.query(Recipe).options(
        selectinload(Recipe.items).selectinload(RecipeItem.ingredient)
    ).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Receita nao encontrada")
    return recipe


@router.get("/", response_model=list[RecipeOut])
def list_recipes(
    active_only: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Recipe).options(
        selectinload(Recipe.items).selectinload(RecipeItem.ingredient)
    )
    if active_only:
        q = q.filter(Recipe.is_active == True)
    return [build_recipe_out(r) for r in q.order_by(Recipe.name).all()]


@router.get("/{recipe_id}", response_model=RecipeOut)
def get_recipe(recipe_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return build_recipe_out(_load_recipe(recipe_id, db))


@router.post("/", response_model=RecipeOut, status_code=status.HTTP_201_CREATED)
def create_recipe(data: RecipeIn, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    recipe = Recipe(
        name=data.name,
        description=data.description,
        prep_time_minutes=data.prep_time_minutes,
        yield_units=data.yield_units,
    )
    db.add(recipe)
    db.flush()
    for item in data.items:
        db.add(RecipeItem(recipe_id=recipe.id, ingredient_id=item.ingredient_id, quantity=item.quantity))
    db.commit()
    return build_recipe_out(_load_recipe(recipe.id, db))


@router.put("/{recipe_id}", response_model=RecipeOut)
def update_recipe(recipe_id: int, data: RecipeIn, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Receita nao encontrada")
    recipe.name = data.name
    recipe.description = data.description
    recipe.prep_time_minutes = data.prep_time_minutes
    recipe.yield_units = data.yield_units
    db.query(RecipeItem).filter(RecipeItem.recipe_id == recipe_id).delete()
    for item in data.items:
        db.add(RecipeItem(recipe_id=recipe_id, ingredient_id=item.ingredient_id, quantity=item.quantity))
    db.commit()
    return build_recipe_out(_load_recipe(recipe_id, db))


@router.patch("/{recipe_id}/toggle", response_model=RecipeOut)
def toggle_recipe(recipe_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    recipe = _load_recipe(recipe_id, db)
    recipe.is_active = not recipe.is_active
    db.commit()
    db.refresh(recipe)
    return build_recipe_out(_load_recipe(recipe_id, db))


@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recipe(recipe_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Receita nao encontrada")
    has_products = db.query(Product).filter(Product.recipe_id == recipe_id).first()
    if has_products:
        raise HTTPException(status_code=400, detail="Receita possui produtos vinculados. Desvincule ou exclua os produtos primeiro.")
    db.query(RecipeItem).filter(RecipeItem.recipe_id == recipe_id).delete()
    db.delete(recipe)
    db.commit()
