"""add contracts and provider_info tables

Revision ID: c1d2e3f4a5b6
Revises: 0bd096db5ae8
Create Date: 2026-05-30 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, Sequence[str], None] = '0bd096db5ae8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ── provider_info 시드 데이터 ───────────────────────────────────
# 출처: docs/약정확인_도우미.md
# 규칙: 확인된 데이터만. 미확인(SK매직·쿠쿠 등)은 null — 추측 금지.
PROVIDER_SEED = [
    # 통신사
    {
        "provider": "SKT",
        "short_number": "114",
        "center_number": "1599-0011 / 080-011-6000",
        "app_name": "T월드",
        "check_path": "MY > 나의 가입정보 (약정기간)",
        "category_hint": "휴대폰/인터넷/TV",
    },
    {
        "provider": "KT",
        "short_number": "100",
        "center_number": "080-258-0114",
        "app_name": "마이케이티(My KT)",
        "check_path": "챗봇에 \"약정 기간 조회\" 입력",
        "category_hint": "휴대폰/인터넷/TV",
    },
    {
        "provider": "LG U+",
        "short_number": "101",
        "center_number": "1544-0010",
        "app_name": "당신의 U+",
        "check_path": "가입정보 / 챗봇",
        "category_hint": "휴대폰/인터넷/TV",
    },
    # 알뜰폰 — 번호·앱 모두 각사 상이 → null, fallback: 고객센터 검색
    {
        "provider": "알뜰폰(MVNO)",
        "short_number": None,
        "center_number": None,
        "app_name": None,
        "check_path": None,
        "category_hint": "휴대폰",
    },
    # 렌탈
    {
        "provider": "코웨이",
        "short_number": None,
        "center_number": "1588-5200",
        "app_name": None,
        "check_path": "고객센터/마이페이지",
        "category_hint": "정수기/렌탈가전",
    },
    {
        "provider": "청호나이스",
        "short_number": None,
        "center_number": "1588-2290",
        "app_name": None,
        "check_path": "평일 9~18시",
        "category_hint": "정수기/렌탈가전",
    },
    {
        "provider": "LG전자(케어십/구독)",
        "short_number": None,
        "center_number": "1544-7777",
        "app_name": None,
        "check_path": "LG 베스트케어 > 렌탈서비스에서 조회",
        "category_hint": "렌탈가전",
    },
    # 미확인 — null 유지, 프론트는 "고객센터 검색" fallback 처리
    {
        "provider": "SK매직",
        "short_number": None,
        "center_number": None,
        "app_name": None,
        "check_path": None,
        "category_hint": "렌탈가전",
    },
    {
        "provider": "쿠쿠",
        "short_number": None,
        "center_number": None,
        "app_name": None,
        "check_path": None,
        "category_hint": "정수기/렌탈가전",
    },
    {
        "provider": "교원웰스",
        "short_number": None,
        "center_number": None,
        "app_name": None,
        "check_path": None,
        "category_hint": "정수기/렌탈가전",
    },
    {
        "provider": "현대큐밍",
        "short_number": None,
        "center_number": None,
        "app_name": None,
        "check_path": None,
        "category_hint": "렌탈가전",
    },
]


def upgrade() -> None:
    # ── 1. contracts 테이블 생성 ────────────────────────────────
    op.create_table(
        "contracts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("term_months", sa.Integer(), nullable=True),
        sa.Column("monthly_fee", sa.Integer(), nullable=True),
        sa.Column("penalty_fee", sa.Integer(), nullable=True),
        sa.Column("device_subsidy", sa.Integer(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("accuracy", sa.String(), nullable=False, server_default="estimated"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_contracts_id", "contracts", ["id"], unique=False)
    op.create_index("ix_contracts_user_id", "contracts", ["user_id"], unique=False)

    # ── 2. provider_info 테이블 생성 ────────────────────────────
    op.create_table(
        "provider_info",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("short_number", sa.String(), nullable=True),
        sa.Column("center_number", sa.String(), nullable=True),
        sa.Column("app_name", sa.String(), nullable=True),
        sa.Column("check_path", sa.String(), nullable=True),
        sa.Column("category_hint", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider"),
    )
    op.create_index("ix_provider_info_id", "provider_info", ["id"], unique=False)
    op.create_index("ix_provider_info_provider", "provider_info", ["provider"], unique=True)

    # ── 3. provider_info 시드 삽입 ──────────────────────────────
    provider_table = sa.table(
        "provider_info",
        sa.column("provider", sa.String),
        sa.column("short_number", sa.String),
        sa.column("center_number", sa.String),
        sa.column("app_name", sa.String),
        sa.column("check_path", sa.String),
        sa.column("category_hint", sa.String),
    )
    op.bulk_insert(provider_table, PROVIDER_SEED)

    # ── 4. 기존 user_profiles.contract_end_date → contracts 이관 ─
    # start_date·term_months 불명(단순 날짜만 있음) → null, accuracy='confirmed'
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            "SELECT id, user_id, telecom_carrier, contract_end_date "
            "FROM user_profiles "
            "WHERE contract_end_date IS NOT NULL"
        )
    ).fetchall()

    if rows:
        contracts_table = sa.table(
            "contracts",
            sa.column("user_id", sa.Integer),
            sa.column("category", sa.String),
            sa.column("provider", sa.String),
            sa.column("start_date", sa.Date),
            sa.column("term_months", sa.Integer),
            sa.column("end_date", sa.Date),
            sa.column("accuracy", sa.String),
            sa.column("is_active", sa.Boolean),
            sa.column("created_at", sa.DateTime),
            sa.column("updated_at", sa.DateTime),
        )
        from datetime import datetime, timezone as tz
        now = datetime.now(tz.utc)
        migration_rows = [
            {
                "user_id": row[1],
                "category": "휴대폰",
                "provider": row[2] if row[2] else "미확인",
                "start_date": None,
                "term_months": None,
                "end_date": row[3],
                "accuracy": "confirmed",
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            }
            for row in rows
        ]
        op.bulk_insert(contracts_table, migration_rows)


def downgrade() -> None:
    op.drop_index("ix_provider_info_provider", table_name="provider_info")
    op.drop_index("ix_provider_info_id", table_name="provider_info")
    op.drop_table("provider_info")

    op.drop_index("ix_contracts_user_id", table_name="contracts")
    op.drop_index("ix_contracts_id", table_name="contracts")
    op.drop_table("contracts")
