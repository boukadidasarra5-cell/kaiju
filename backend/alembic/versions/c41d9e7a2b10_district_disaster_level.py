"""per-district disaster level

Revision ID: c41d9e7a2b10
Revises: bfc253012f0c
Create Date: 2026-09-21 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c41d9e7a2b10'
down_revision: Union[str, Sequence[str], None] = 'bfc253012f0c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('districts', sa.Column('disaster_level', sa.Integer(), server_default='1', nullable=False))
    op.add_column('districts', sa.Column('disaster_updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True))
    # les quartiers héritent du niveau global existant
    op.execute("UPDATE districts SET disaster_level = COALESCE((SELECT level FROM disaster_state WHERE id = 1), 1)")
    op.drop_table('disaster_state')


def downgrade() -> None:
    op.create_table('disaster_state',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('level', sa.Integer(), nullable=False),
    sa.Column('updated_by_id', sa.Integer(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.execute("INSERT INTO disaster_state (id, level) SELECT 1, COALESCE(MAX(disaster_level), 1) FROM districts")
    op.drop_column('districts', 'disaster_updated_at')
    op.drop_column('districts', 'disaster_level')
