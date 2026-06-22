"""add market_benchmarks

Revision ID: f7a8b9c0d1e2
Revises: e6f7a8b9c0d1
Create Date: 2026-06-22 00:00:00.000000

"""
from datetime import datetime, timezone
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'f7a8b9c0d1e2'
down_revision: Union[str, Sequence[str], None] = 'e6f7a8b9c0d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    table = op.create_table(
        'market_benchmarks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('reattach_subsidy_approx', sa.Integer(), nullable=True),
        sa.Column('new_subsidy_approx', sa.Integer(), nullable=True),
        sa.Column('discount_note', sa.String(), nullable=True),
        sa.Column('source', sa.String(), nullable=True),
        sa.Column('effective_month', sa.String(), nullable=True),
        sa.Column('is_latest', sa.Boolean(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_market_benchmarks_category', 'market_benchmarks', ['category'])
    op.create_index('ix_market_benchmarks_is_latest', 'market_benchmarks', ['is_latest'])

    now = datetime.now(timezone.utc)
    src = "방통위 경품 한도·시장 대략"
    month = "2026-06"
    # 초기 '대략' seed — 어드민이 매월 갱신. 표시는 항상 '대략 + 기준월'.
    op.bulk_insert(table, [
        {"category": "인터넷", "reattach_subsidy_approx": 150000, "new_subsidy_approx": 300000,
         "discount_note": "재약정 시 약정할인 유지", "source": src, "effective_month": month,
         "is_latest": True, "updated_at": now},
        {"category": "TV", "reattach_subsidy_approx": 150000, "new_subsidy_approx": 350000,
         "discount_note": "재약정 시 약정할인 유지", "source": src, "effective_month": month,
         "is_latest": True, "updated_at": now},
        {"category": "정수기", "reattach_subsidy_approx": None, "new_subsidy_approx": None,
         "discount_note": "재계약 시 요금할인·사은품 협상", "source": "시장 대략", "effective_month": month,
         "is_latest": True, "updated_at": now},
        {"category": "휴대폰", "reattach_subsidy_approx": None, "new_subsidy_approx": None,
         "discount_note": "선택약정 25% 재약정 할인", "source": "공식 약정할인율", "effective_month": month,
         "is_latest": True, "updated_at": now},
    ])


def downgrade() -> None:
    op.drop_index('ix_market_benchmarks_is_latest', table_name='market_benchmarks')
    op.drop_index('ix_market_benchmarks_category', table_name='market_benchmarks')
    op.drop_table('market_benchmarks')
