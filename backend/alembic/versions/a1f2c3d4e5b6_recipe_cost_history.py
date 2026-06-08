"""recipe_cost_history

Revision ID: a1f2c3d4e5b6
Revises: 91cbb715acb9
Create Date: 2026-06-05
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a1f2c3d4e5b6'
down_revision: Union[str, None] = '91cbb715acb9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'recipe_cost_history',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('recipe_id', sa.Integer(), sa.ForeignKey('recipes.id'), nullable=False),
        sa.Column('total_cost', sa.Numeric(10, 2), nullable=False),
        sa.Column('cost_per_unit', sa.Numeric(10, 4), nullable=False),
        sa.Column('breakdown', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('reason', sa.String(50), nullable=True),
        sa.Column('recorded_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_recipe_cost_history_recipe_id', 'recipe_cost_history', ['recipe_id'])
    op.create_index('ix_recipe_cost_history_recorded_at', 'recipe_cost_history', ['recorded_at'])


def downgrade() -> None:
    op.drop_index('ix_recipe_cost_history_recorded_at', table_name='recipe_cost_history')
    op.drop_index('ix_recipe_cost_history_recipe_id', table_name='recipe_cost_history')
    op.drop_table('recipe_cost_history')
