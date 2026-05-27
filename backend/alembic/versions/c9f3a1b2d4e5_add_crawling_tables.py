"""add_crawling_tables

Revision ID: c9f3a1b2d4e5
Revises: 7007f5807348
Create Date: 2026-05-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c9f3a1b2d4e5"
down_revision: Union[str, Sequence[str], None] = "7007f5807348"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # users 테이블에 is_admin 추가
    op.add_column("users", sa.Column("is_admin", sa.Boolean(), nullable=False, server_default="false"))

    # cards
    op.create_table(
        "cards",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("company", sa.String(), nullable=False),
        sa.Column("annual_fee", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("card_type", sa.String(), nullable=True, server_default="credit"),
        sa.Column("apply_url", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("data_month", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_cards_id"), "cards", ["id"], unique=False)

    # card_benefits
    op.create_table(
        "card_benefits",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("card_id", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("benefit_type", sa.String(), nullable=True, server_default="cashback"),
        sa.Column("rate", sa.Float(), nullable=False),
        sa.Column("condition_amount", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("monthly_max", sa.Integer(), nullable=True),
        sa.Column("description", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["card_id"], ["cards.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_card_benefits_id"), "card_benefits", ["id"], unique=False)

    # telecom_plans
    op.create_table(
        "telecom_plans",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("carrier", sa.String(), nullable=False),
        sa.Column("plan_name", sa.String(), nullable=False),
        sa.Column("monthly_fee", sa.Integer(), nullable=False),
        sa.Column("data_gb", sa.Float(), nullable=True),
        sa.Column("data_unlimited", sa.Boolean(), nullable=True, server_default="false"),
        sa.Column("call_type", sa.String(), nullable=True, server_default="무제한"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("data_month", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_telecom_plans_id"), "telecom_plans", ["id"], unique=False)

    # crawl_tasks
    op.create_table(
        "crawl_tasks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("target", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=True, server_default="pending"),
        sa.Column("result_json", sa.JSON(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("record_count", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("approved", sa.Boolean(), nullable=True, server_default="false"),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_crawl_tasks_id"), "crawl_tasks", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_crawl_tasks_id"), table_name="crawl_tasks")
    op.drop_table("crawl_tasks")
    op.drop_index(op.f("ix_telecom_plans_id"), table_name="telecom_plans")
    op.drop_table("telecom_plans")
    op.drop_index(op.f("ix_card_benefits_id"), table_name="card_benefits")
    op.drop_table("card_benefits")
    op.drop_index(op.f("ix_cards_id"), table_name="cards")
    op.drop_table("cards")
    op.drop_column("users", "is_admin")
