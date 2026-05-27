"""add_crawled_at_is_latest_saving_benchmarks

Revision ID: e5f6a7b8c9d0
Revises: d1e2f3a4b5c6
Create Date: 2026-05-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, Sequence[str], None] = "d1e2f3a4b5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # cards 테이블에 crawled_at, is_latest 추가
    op.add_column("cards", sa.Column("is_latest", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column("cards", sa.Column("crawled_at", sa.DateTime(timezone=True), nullable=True))

    # telecom_plans 테이블에 crawled_at, is_latest 추가
    op.add_column("telecom_plans", sa.Column("is_latest", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column("telecom_plans", sa.Column("crawled_at", sa.DateTime(timezone=True), nullable=True))

    # saving_benchmarks 테이블 생성
    op.create_table(
        "saving_benchmarks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("benchmark_type", sa.String(), nullable=False),
        sa.Column("label", sa.String(), nullable=False),
        sa.Column("spending_monthly", sa.Integer(), nullable=True),
        sa.Column("saving_monthly", sa.Integer(), nullable=False),
        sa.Column("saving_annual", sa.Integer(), nullable=False),
        sa.Column("best_strategy", sa.JSON(), nullable=True),
        sa.Column("calculated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_saving_benchmarks_id"), "saving_benchmarks", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_saving_benchmarks_id"), table_name="saving_benchmarks")
    op.drop_table("saving_benchmarks")
    op.drop_column("telecom_plans", "crawled_at")
    op.drop_column("telecom_plans", "is_latest")
    op.drop_column("cards", "crawled_at")
    op.drop_column("cards", "is_latest")
