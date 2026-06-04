"""initial_schema

Revision ID: 91cbb715acb9
Revises: 
Create Date: 2026-06-04
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '91cbb715acb9'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Usuarios
    op.create_table('users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('email', sa.String(200), unique=True, nullable=False),
        sa.Column('hashed_password', sa.String(200), nullable=False),
        sa.Column('role', sa.Enum('admin', 'operador', name='userrole'), nullable=False, server_default='operador'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_users_email', 'users', ['email'])

    # Clientes
    op.create_table('customers',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(150), nullable=False),
        sa.Column('phone', sa.String(30), nullable=True),
        sa.Column('location', sa.String(200), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Maquininhas
    op.create_table('card_machines',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('debit_fee_percent', sa.Numeric(5, 2), nullable=False, server_default='1.5'),
        sa.Column('credit_fee_percent', sa.Numeric(5, 2), nullable=False, server_default='3.0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
    )

    # Insumos
    op.create_table('ingredients',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(150), unique=True, nullable=False),
        sa.Column('unit', sa.String(20), nullable=False),
        sa.Column('avg_price_per_unit', sa.Numeric(10, 4), nullable=False, server_default='0'),
        sa.Column('last_price_per_unit', sa.Numeric(10, 4), nullable=False, server_default='0'),
        sa.Column('last_supplier', sa.String(200), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Historico de precos
    op.create_table('ingredient_price_history',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('ingredient_id', sa.Integer(), sa.ForeignKey('ingredients.id'), nullable=False),
        sa.Column('price_per_unit', sa.Numeric(10, 4), nullable=False),
        sa.Column('package_price', sa.Numeric(10, 2), nullable=True),
        sa.Column('package_weight', sa.Numeric(10, 4), nullable=True),
        sa.Column('supplier', sa.String(200), nullable=True),
        sa.Column('recorded_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Conta de luz
    op.create_table('electricity_bills',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('reference_month', sa.String(7), nullable=False),
        sa.Column('kwh_consumed', sa.Numeric(10, 2), nullable=False),
        sa.Column('kwh_rate', sa.Numeric(8, 4), nullable=False),
        sa.Column('total_cost', sa.Numeric(10, 2), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Receitas (bateladas)
    op.create_table('recipes',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(150), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('prep_time_minutes', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('yield_units', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Ficha tecnica (insumos por receita)
    op.create_table('recipe_items',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('recipe_id', sa.Integer(), sa.ForeignKey('recipes.id'), nullable=False),
        sa.Column('ingredient_id', sa.Integer(), sa.ForeignKey('ingredients.id'), nullable=False),
        sa.Column('quantity', sa.Numeric(10, 4), nullable=False),
        sa.UniqueConstraint('recipe_id', 'ingredient_id'),
    )

    # Produtos (o que e vendido)
    op.create_table('products',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(150), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('sale_price', sa.Numeric(10, 2), nullable=False),
        sa.Column('recipe_id', sa.Integer(), sa.ForeignKey('recipes.id'), nullable=True),
        sa.Column('units_per_batch', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Vendas
    op.create_table('sales',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('client_ref', sa.String(50), unique=True, nullable=True),
        sa.Column('operator_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('customer_id', sa.Integer(), sa.ForeignKey('customers.id'), nullable=True),
        sa.Column('payment_method', sa.Enum('dinheiro', 'pix', 'debito', 'credito', name='paymentmethod'), nullable=False),
        sa.Column('card_machine_id', sa.Integer(), sa.ForeignKey('card_machines.id'), nullable=True),
        sa.Column('subtotal', sa.Numeric(10, 2), nullable=False),
        sa.Column('card_fee_amount', sa.Numeric(10, 2), nullable=False, server_default='0'),
        sa.Column('total_cost', sa.Numeric(10, 2), nullable=False),
        sa.Column('gross_profit', sa.Numeric(10, 2), nullable=False),
        sa.Column('profit_margin', sa.Numeric(5, 2), nullable=False),
        sa.Column('status', sa.Enum('pendente', 'confirmada', 'cancelada', name='salestatus'), nullable=False, server_default='confirmada'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('sold_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_sales_client_ref', 'sales', ['client_ref'])

    # Itens da venda
    op.create_table('sale_items',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('sale_id', sa.Integer(), sa.ForeignKey('sales.id'), nullable=False),
        sa.Column('product_id', sa.Integer(), sa.ForeignKey('products.id'), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('unit_price', sa.Numeric(10, 2), nullable=False),
        sa.Column('unit_cost', sa.Numeric(10, 2), nullable=False),
        sa.Column('line_total', sa.Numeric(10, 2), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('sale_items')
    op.drop_table('sales')
    op.drop_table('products')
    op.drop_table('recipe_items')
    op.drop_table('recipes')
    op.drop_table('electricity_bills')
    op.drop_table('ingredient_price_history')
    op.drop_table('ingredients')
    op.drop_table('card_machines')
    op.drop_table('customers')
    op.drop_table('users')
