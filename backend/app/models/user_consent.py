from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.core.database import Base


class UserConsent(Base):
    __tablename__ = "user_consents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    terms_agreed = Column(Boolean, default=False, nullable=False)      # 서비스 이용약관 (필수)
    privacy_agreed = Column(Boolean, default=False, nullable=False)    # 개인정보 처리방침 (필수)
    marketing_agreed = Column(Boolean, default=False, nullable=False)  # 마케팅 수신 동의 (선택)
    agreed_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", back_populates="consent")
