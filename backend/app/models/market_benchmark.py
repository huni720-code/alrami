from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Integer, String

from app.core.database import Base


class MarketBenchmark(Base):
    """카테고리별 '대략' 시장 벤치마크.
    - 값은 코드에 박지 않고 이 테이블에 둔다(어드민이 수시로 갱신 → 앱은 항상 최신 행을 읽음).
    - 출처는 공개·공식(방통위 경품 한도·공식 약정할인율 등). 경쟁사 크롤 금지.
    - 표시는 항상 '대략 + 기준월'. 정확 금액 단정 아님.
    """
    __tablename__ = "market_benchmarks"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, nullable=False, index=True)  # 휴대폰/인터넷/TV/정수기
    reattach_subsidy_approx = Column(Integer, nullable=True)  # 재약정(유지) 사은품 대략, 원
    new_subsidy_approx = Column(Integer, nullable=True)       # 신규/갈아타기 사은품 대략, 원
    discount_note = Column(String, nullable=True)            # 요금할인 설명(예: 선택약정 25% 재약정)
    source = Column(String, nullable=True)                   # 출처 라벨(예: 방통위 경품 한도)
    effective_month = Column(String, nullable=True)          # 기준월 'YYYY-MM'
    is_latest = Column(Boolean, nullable=False, default=True, index=True)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
