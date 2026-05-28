"""add user_cards and card_transactions

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-28

"""
from alembic import op
import sqlalchemy as sa

revision = "b2c3d4e5f6a7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_cards",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("card_id", sa.Integer(), sa.ForeignKey("cards.id"), nullable=False),
        sa.Column("nickname", sa.String(), nullable=True),
        sa.Column("last_4_digits", sa.String(4), nullable=True),
        sa.Column("performance_target", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_user_cards_user_id", "user_cards", ["user_id"])

    op.create_table(
        "card_transactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("user_card_id", sa.Integer(), sa.ForeignKey("user_cards.id"), nullable=True),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("merchant", sa.String(), nullable=True),
        sa.Column("transaction_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("raw_sms", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_card_transactions_user_id", "card_transactions", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_card_transactions_user_id", "card_transactions")
    op.drop_table("card_transactions")
    op.drop_index("ix_user_cards_user_id", "user_cards")
    op.drop_table("user_cards")
