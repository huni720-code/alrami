"""add_admin_logs

Revision ID: d1e2f3a4b5c6
Revises: c9f3a1b2d4e5
Create Date: 2026-05-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, Sequence[str], None] = "c9f3a1b2d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "admin_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("target_type", sa.String(), nullable=True),
        sa.Column("target_id", sa.Integer(), nullable=True),
        sa.Column("detail", sa.JSON(), nullable=True),
        sa.Column("performed_by", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["performed_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_admin_logs_id"), "admin_logs", ["id"], unique=False)
    op.create_index("ix_admin_logs_created_at", "admin_logs", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_admin_logs_created_at", table_name="admin_logs")
    op.drop_index(op.f("ix_admin_logs_id"), table_name="admin_logs")
    op.drop_table("admin_logs")
