"""add contract switch logs

Revision ID: a1b2c3d4e5f6
Revises: d2e3f4a5b6c7
Create Date: 2026-06-02
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b7c8d9e0f1a2"
down_revision: Union[str, Sequence[str], None] = "d2e3f4a5b6c7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "contract_switch_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "contract_id",
            sa.Integer(),
            sa.ForeignKey("contracts.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("switched", sa.Boolean(), nullable=False),
        sa.Column("estimated_saving_annual", sa.Integer(), nullable=True),
        sa.Column(
            "switched_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_contract_switch_logs_user_id", "contract_switch_logs", ["user_id"])
    op.create_index("ix_contract_switch_logs_contract_id", "contract_switch_logs", ["contract_id"])


def downgrade() -> None:
    op.drop_index("ix_contract_switch_logs_contract_id", "contract_switch_logs")
    op.drop_index("ix_contract_switch_logs_user_id", "contract_switch_logs")
    op.drop_table("contract_switch_logs")
