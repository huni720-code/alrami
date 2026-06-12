"""phone unique identifier + email nullable

식별자를 이메일 → 전화번호로 전환.
- users.phone 에 nullable unique index (Postgres: 다중 NULL 허용)
- users.email 을 nullable 로 변경 (전화번호 가입자는 이메일 없을 수 있음)

Revision ID: d4e5f6a7b8c9
Revises: c0a1b2c3d4e5
Create Date: 2026-06-12 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'c0a1b2c3d4e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # email 을 nullable 로 (전화번호 단독 가입 허용)
    op.alter_column('users', 'email', existing_type=sa.String(), nullable=True)
    # phone 에 unique index (Postgres nullable unique → 여러 NULL 허용 OK)
    op.create_index('ix_users_phone', 'users', ['phone'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_users_phone', table_name='users')
    op.alter_column('users', 'email', existing_type=sa.String(), nullable=False)
