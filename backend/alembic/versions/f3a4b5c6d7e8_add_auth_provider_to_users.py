"""add auth_provider to users

Revision ID: f3a4b5c6d7e8
Revises: b7c8d9e0f1a2
Create Date: 2026-06-02
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f3a4b5c6d7e8"
down_revision: Union[str, Sequence[str], None] = "b7c8d9e0f1a2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("auth_provider", sa.String(), server_default="email", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("users", "auth_provider")
