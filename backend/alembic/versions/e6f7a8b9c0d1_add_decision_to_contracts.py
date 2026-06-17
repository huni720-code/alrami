"""add decision to contracts

Revision ID: e6f7a8b9c0d1
Revises: d4e5f6a7b8c9
Create Date: 2026-06-17 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'e6f7a8b9c0d1'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 결정 상태: keep(이대로 둘게요) | switch | NULL. keep이면 스케줄러가 재알림을 건너뜀.
    op.add_column('contracts', sa.Column('decision', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('contracts', 'decision')
