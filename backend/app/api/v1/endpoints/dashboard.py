from decimal import Decimal
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, cast, Date
from pydantic import BaseModel

from app.db.session import get_db
from app.models.models import Sale, SaleItem, Product, Customer
from app.api.v1.endpoints.auth import require_admin
from app.models.models import User

router = APIRouter()


class SalesSummary(BaseModel):
    total_revenue: Decimal
    total_cost: Decimal
    total_profit: Decimal
    avg_margin: Decimal
    total_sales: int


class TopProduct(BaseModel):
    product_id: int
    product_name: str
    quantity_sold: int
    revenue: Decimal
    avg_margin: Decimal


class TopCustomer(BaseModel):
    customer_id: int
    customer_name: str
    total_purchases: int
    total_spent: Decimal
    last_purchase: datetime


class InactiveCustomer(BaseModel):
    customer_id: int
    customer_name: str
    phone: str | None
    days_inactive: int
    total_spent: Decimal


@router.get("/summary", response_model=SalesSummary)
def get_summary(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    sales = db.query(Sale).filter(Sale.sold_at >= since, Sale.status == "confirmada").all()

    if not sales:
        return SalesSummary(
            total_revenue=Decimal("0"), total_cost=Decimal("0"),
            total_profit=Decimal("0"), avg_margin=Decimal("0"), total_sales=0
        )

    revenue = sum(s.subtotal for s in sales)
    cost = sum(s.total_cost for s in sales)
    profit = sum(s.gross_profit for s in sales)
    avg_margin = sum(s.profit_margin for s in sales) / len(sales)

    return SalesSummary(
        total_revenue=revenue,
        total_cost=cost,
        total_profit=profit,
        avg_margin=avg_margin.quantize(Decimal("0.01")),
        total_sales=len(sales),
    )


@router.get("/top-products", response_model=list[TopProduct])
def get_top_products(
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)

    rows = (
        db.query(
            SaleItem.product_id,
            Product.name,
            func.sum(SaleItem.quantity).label("qty"),
            func.sum(SaleItem.line_total).label("revenue"),
            func.avg(
                (SaleItem.line_total - SaleItem.unit_cost * SaleItem.quantity)
                / SaleItem.line_total * 100
            ).label("avg_margin"),
        )
        .join(Product, SaleItem.product_id == Product.id)
        .join(Sale, SaleItem.sale_id == Sale.id)
        .filter(Sale.sold_at >= since, Sale.status == "confirmada")
        .group_by(SaleItem.product_id, Product.name)
        .order_by(desc("qty"))
        .limit(limit)
        .all()
    )

    return [
        TopProduct(
            product_id=r.product_id,
            product_name=r.name,
            quantity_sold=r.qty,
            revenue=Decimal(str(r.revenue)).quantize(Decimal("0.01")),
            avg_margin=Decimal(str(r.avg_margin or 0)).quantize(Decimal("0.01")),
        )
        for r in rows
    ]


@router.get("/top-customers", response_model=list[TopCustomer])
def get_top_customers(
    days: int = Query(90, ge=1, le=365),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)

    rows = (
        db.query(
            Customer.id,
            Customer.name,
            func.count(Sale.id).label("purchases"),
            func.sum(Sale.subtotal).label("spent"),
            func.max(Sale.sold_at).label("last_purchase"),
        )
        .join(Sale, Sale.customer_id == Customer.id)
        .filter(Sale.sold_at >= since, Sale.status == "confirmada")
        .group_by(Customer.id, Customer.name)
        .order_by(desc("spent"))
        .limit(limit)
        .all()
    )

    return [
        TopCustomer(
            customer_id=r.id,
            customer_name=r.name,
            total_purchases=r.purchases,
            total_spent=Decimal(str(r.spent)).quantize(Decimal("0.01")),
            last_purchase=r.last_purchase,
        )
        for r in rows
    ]


@router.get("/inactive-customers", response_model=list[InactiveCustomer])
def get_inactive_customers(
    inactive_days: int = Query(30, ge=7, le=180),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Clientes que compraram antes mas sumiram há X dias — base para sugestão de promoção."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=inactive_days)

    rows = (
        db.query(
            Customer.id,
            Customer.name,
            Customer.phone,
            func.max(Sale.sold_at).label("last_purchase"),
            func.sum(Sale.subtotal).label("total_spent"),
        )
        .join(Sale, Sale.customer_id == Customer.id)
        .filter(Sale.status == "confirmada")
        .group_by(Customer.id, Customer.name, Customer.phone)
        .having(func.max(Sale.sold_at) < cutoff)
        .order_by("last_purchase")
        .all()
    )

    now = datetime.now(timezone.utc)
    return [
        InactiveCustomer(
            customer_id=r.id,
            customer_name=r.name,
            phone=r.phone,
            days_inactive=(now - r.last_purchase.replace(tzinfo=timezone.utc)).days,
            total_spent=Decimal(str(r.total_spent)).quantize(Decimal("0.01")),
        )
        for r in rows
    ]

class DailySale(BaseModel):
    date: str
    revenue: Decimal
    cost: Decimal
    profit: Decimal
    count: int


class ProductProfit(BaseModel):
    product_id: int
    product_name: str
    revenue: Decimal
    cost: Decimal
    profit: Decimal
    margin: Decimal
    quantity_sold: int


class PaymentBreakdown(BaseModel):
    method: str
    total: Decimal
    count: int


@router.get("/sales-timeline", response_model=list[DailySale])
def get_sales_timeline(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)

    rows = (
        db.query(
            cast(Sale.sold_at, Date).label("date"),
            func.sum(Sale.subtotal).label("revenue"),
            func.sum(Sale.total_cost).label("cost"),
            func.sum(Sale.gross_profit).label("profit"),
            func.count(Sale.id).label("count"),
        )
        .filter(Sale.sold_at >= since, Sale.status == "confirmada")
        .group_by(cast(Sale.sold_at, Date))
        .order_by(cast(Sale.sold_at, Date))
        .all()
    )

    return [
        DailySale(
            date=str(r.date),
            revenue=Decimal(str(r.revenue)).quantize(Decimal("0.01")),
            cost=Decimal(str(r.cost)).quantize(Decimal("0.01")),
            profit=Decimal(str(r.profit)).quantize(Decimal("0.01")),
            count=r.count,
        )
        for r in rows
    ]


@router.get("/profit-by-product", response_model=list[ProductProfit])
def get_profit_by_product(
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)

    rows = (
        db.query(
            SaleItem.product_id,
            Product.name,
            func.sum(SaleItem.line_total).label("revenue"),
            func.sum(SaleItem.unit_cost * SaleItem.quantity).label("cost"),
            func.sum(SaleItem.line_total - SaleItem.unit_cost * SaleItem.quantity).label("profit"),
            func.sum(SaleItem.quantity).label("qty"),
        )
        .join(Product, SaleItem.product_id == Product.id)
        .join(Sale, SaleItem.sale_id == Sale.id)
        .filter(Sale.sold_at >= since, Sale.status == "confirmada")
        .group_by(SaleItem.product_id, Product.name)
        .order_by(desc("profit"))
        .limit(limit)
        .all()
    )

    result = []
    for r in rows:
        rev = Decimal(str(r.revenue))
        cost = Decimal(str(r.cost))
        profit = Decimal(str(r.profit))
        margin = (profit / rev * 100) if rev else Decimal("0")
        result.append(ProductProfit(
            product_id=r.product_id,
            product_name=r.name,
            revenue=rev.quantize(Decimal("0.01")),
            cost=cost.quantize(Decimal("0.01")),
            profit=profit.quantize(Decimal("0.01")),
            margin=margin.quantize(Decimal("0.01")),
            quantity_sold=r.qty,
        ))
    return result


@router.get("/payment-breakdown", response_model=list[PaymentBreakdown])
def get_payment_breakdown(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)

    rows = (
        db.query(
            Sale.payment_method,
            func.sum(Sale.subtotal).label("total"),
            func.count(Sale.id).label("count"),
        )
        .filter(Sale.sold_at >= since, Sale.status == "confirmada")
        .group_by(Sale.payment_method)
        .order_by(desc("total"))
        .all()
    )

    return [
        PaymentBreakdown(
            method=r.payment_method,
            total=Decimal(str(r.total)).quantize(Decimal("0.01")),
            count=r.count,
        )
        for r in rows
    ]
