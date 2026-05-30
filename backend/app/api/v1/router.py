from fastapi import APIRouter

from app.api.v1.endpoints import auth, products, sales, customers, costs, dashboard, users

api_router = APIRouter()

api_router.include_router(auth.router,      prefix="/auth",      tags=["auth"])
api_router.include_router(products.router,  prefix="/products",  tags=["products"])
api_router.include_router(sales.router,     prefix="/sales",     tags=["sales"])
api_router.include_router(customers.router, prefix="/customers", tags=["customers"])
api_router.include_router(costs.router,     prefix="/costs",     tags=["costs"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(users.router,     prefix="/users",     tags=["users"])
