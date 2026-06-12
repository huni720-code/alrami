from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    telecom_carrier = Column(String, nullable=True)
    telecom_monthly_fee = Column(Integer, nullable=True)
    contract_end_date = Column(Date, nullable=True)
    card_monthly_total = Column(Integer, nullable=True)
    has_ott = Column(Boolean, default=False)
    has_rental = Column(Boolean, default=False)
    rental_end_date = Column(Date, nullable=True)
    # 약정 D-day 알림 시점(일) JSON 문자열. 기본 "[30, 7, 0, -7]"
    # 양수=만료 전, 0=당일, 음수=만료 후. 스케줄러가 사용자별 필터에 사용.
    alarm_days = Column(String, nullable=False, server_default="[30, 7, 0, -7]")
    onboarding_completed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", back_populates="profile")
