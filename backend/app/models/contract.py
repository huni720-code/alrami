from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    category = Column(String, nullable=False)   # 휴대폰/인터넷/TV/정수기/비데/렌탈가전
    provider = Column(String, nullable=False)
    start_date = Column(Date, nullable=True)    # 이관 데이터는 없을 수 있음
    term_months = Column(Integer, nullable=True)
    monthly_fee = Column(Integer, nullable=True)
    penalty_fee = Column(Integer, nullable=True)
    device_subsidy = Column(Integer, nullable=True)
    end_date = Column(Date, nullable=False)     # 항상 백엔드 계산/저장
    accuracy = Column(String, nullable=False, default="estimated")  # estimated | confirmed
    owner_label = Column(String, nullable=True)  # 가족 라벨: 나/엄마/아빠/배우자/자녀/집
    decision = Column(String, nullable=True)  # keep(이대로 둘게요) | switch | None — keep이면 재알림 억제
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", back_populates="contracts")
