from decimal import Decimal
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer, Numeric,
    String, Text, Enum, UniqueConstraint, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def utcnow():
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class UserRole(str, PyEnum):
    admin = "admin"
    operador = "operador"


class PaymentMethod(str, PyEnum):
    dinheiro = "dinheiro"
    pix = "pix"
    debito = "debito"
    credito = "credito"


class SaleStatus(str, PyEnum):
    pendente = "pendente"      # criada offline, ainda não sincronizada
    confirmada = "confirmada"
    cancelada = "cancelada"


# ---------------------------------------------------------------------------
# Usuários
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(200))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.operador)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    sales: Mapped[list["Sale"]] = relationship(back_populates="operator")


# ---------------------------------------------------------------------------
# Clientes
# ---------------------------------------------------------------------------

class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    phone: Mapped[str | None] = mapped_column(String(30))
    location: Mapped[str | None] = mapped_column(String(200))  # ex: "Ed. Villa Lobos"
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    sales: Mapped[list["Sale"]] = relationship(back_populates="customer")


# ---------------------------------------------------------------------------
# Maquininhas e taxas
# ---------------------------------------------------------------------------

class CardMachine(Base):
    __tablename__ = "card_machines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100))          # ex: "Cielo D150"
    debit_fee_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("1.5"))
    credit_fee_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("3.0"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


# ---------------------------------------------------------------------------
# Insumos (matéria-prima)
# ---------------------------------------------------------------------------

class Ingredient(Base):
    __tablename__ = "ingredients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True)
    unit: Mapped[str] = mapped_column(String(20))   # ex: "g", "ml", "un"
    avg_price_per_unit: Mapped[Decimal] = mapped_column(Numeric(10, 4), default=Decimal("0"))
    last_price_per_unit: Mapped[Decimal] = mapped_column(Numeric(10, 4), default=Decimal("0"))
    last_supplier: Mapped[str | None] = mapped_column(String(200))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    recipe_items: Mapped[list["RecipeItem"]] = relationship(back_populates="ingredient")
    price_history: Mapped[list["IngredientPriceHistory"]] = relationship(
        back_populates="ingredient", order_by="IngredientPriceHistory.recorded_at.desc()"
    )


class IngredientPriceHistory(Base):
    """Histórico de preços para calcular preço médio."""
    __tablename__ = "ingredient_price_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ingredient_id: Mapped[int] = mapped_column(ForeignKey("ingredients.id"))
    price_per_unit: Mapped[Decimal] = mapped_column(Numeric(10, 4))
    package_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))   # preço pago na embalagem
    package_weight: Mapped[Decimal | None] = mapped_column(Numeric(10, 4))  # peso da embalagem
    supplier: Mapped[str | None] = mapped_column(String(200))
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    ingredient: Mapped["Ingredient"] = relationship(back_populates="price_history")


# ---------------------------------------------------------------------------
# Conta de Luz
# ---------------------------------------------------------------------------

class ElectricityBill(Base):
    __tablename__ = "electricity_bills"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    reference_month: Mapped[str] = mapped_column(String(7))  # "2025-01"
    kwh_consumed: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    kwh_rate: Mapped[Decimal] = mapped_column(Numeric(8, 4))   # R$/kWh
    total_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


# ---------------------------------------------------------------------------
# Produtos e Ficha Técnica
# ---------------------------------------------------------------------------

class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    description: Mapped[str | None] = mapped_column(Text)
    sale_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    prep_time_minutes: Mapped[int] = mapped_column(Integer, default=0)  # para rateio de luz
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    recipe_items: Mapped[list["RecipeItem"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )
    sale_items: Mapped[list["SaleItem"]] = relationship(back_populates="product")


class RecipeItem(Base):
    """Ficha técnica: quantidade de cada insumo por produto."""
    __tablename__ = "recipe_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    ingredient_id: Mapped[int] = mapped_column(ForeignKey("ingredients.id"))
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 4))  # na unidade do insumo

    __table_args__ = (UniqueConstraint("product_id", "ingredient_id"),)

    product: Mapped["Product"] = relationship(back_populates="recipe_items")
    ingredient: Mapped["Ingredient"] = relationship(back_populates="recipe_items")


# ---------------------------------------------------------------------------
# Vendas
# ---------------------------------------------------------------------------

class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # ID gerado localmente no PWA para idempotência (evita duplicata no sync offline)
    client_ref: Mapped[str | None] = mapped_column(String(50), unique=True, index=True)

    operator_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("customers.id"), nullable=True)

    payment_method: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod))
    card_machine_id: Mapped[int | None] = mapped_column(ForeignKey("card_machines.id"), nullable=True)

    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    card_fee_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0"))
    total_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2))   # custo dos insumos + taxa
    gross_profit: Mapped[Decimal] = mapped_column(Numeric(10, 2)) # subtotal - total_cost
    profit_margin: Mapped[Decimal] = mapped_column(Numeric(5, 2)) # % margem

    status: Mapped[SaleStatus] = mapped_column(Enum(SaleStatus), default=SaleStatus.confirmada)
    notes: Mapped[str | None] = mapped_column(Text)

    sold_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    operator: Mapped["User"] = relationship(back_populates="sales")
    customer: Mapped["Customer | None"] = relationship(back_populates="sales")
    card_machine: Mapped["CardMachine | None"] = relationship()
    items: Mapped[list["SaleItem"]] = relationship(
        back_populates="sale", cascade="all, delete-orphan"
    )


class SaleItem(Base):
    __tablename__ = "sale_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id"))
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))   # preço no momento da venda
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2))    # custo no momento da venda
    line_total: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    sale: Mapped["Sale"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship(back_populates="sale_items")
