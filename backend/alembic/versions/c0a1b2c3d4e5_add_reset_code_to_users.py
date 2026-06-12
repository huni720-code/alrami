"""add reset_code to users

Revision ID: c0a1b2c3d4e5
Revises: b8d9e0f1a2c3
Create Date: 2026-06-12 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c0a1b2c3d4e5'
down_revision: Union[str, Sequence[str], None] = 'b8d9e0f1a2c3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('reset_code', sa.String(), nullable=True))
    op.add_column('users', sa.Column('reset_code_expires', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'reset_code_expires')
    op.drop_column('users', 'reset_code')
