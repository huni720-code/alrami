"""add alarm_days to user_profiles

Revision ID: b8d9e0f1a2c3
Revises: a4b5c6d7e8f9
Create Date: 2026-06-12 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b8d9e0f1a2c3'
down_revision: Union[str, Sequence[str], None] = 'a4b5c6d7e8f9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'user_profiles',
        sa.Column(
            'alarm_days',
            sa.String(),
            nullable=False,
            server_default='[30, 7, 0, -7]',
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('user_profiles', 'alarm_days')
