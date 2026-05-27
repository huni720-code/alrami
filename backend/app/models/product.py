from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class Card(Base):
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    company = Column(String, nullable=False)
    annual_fee = Column(Integer, default=0)
    card_type = Column(String, default="credit")  # credit | debit
    apply_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_latest = Column(Boolean, default=True, nullable=False)
    crawled_at = Column(DateTime(timezone=True), nullable=True)
    data_month = Column(String, nullable=False)  # "2026-05"
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    benefits = relationship("CardBenefit", back_populates="card", cascade="all, delete-orphan")


class CardBenefit(Base):
    __tablename__ = "card_benefits"

    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, ForeignKey("cards.id"), nullable=False)
    category = Column(String, nullable=False)  # 편의점, 카페, 마트, 주유, 온라인쇼핑, 대중교통, 해외, 전체
    benefit_type = Column(String, default="cashback")  # cashback | point | discount
    rate = Column(Float, nullable=False)  # 0.05 = 5%
    condition_amount = Column(Integer, default=0)  # 전월실적 조건 (원)
    monthly_max = Column(Integer, nullable=True)  # 월 최대 혜택 (원)
    description = Column(String, nullable=True)

    card = relationship("Card", back_populates="benefits")


class TelecomPlan(Base):
    __tablename__ = "telecom_plans"

    id = Column(Integer, primary_key=True, index=True)
    carrier = Column(String, nullable=False)  # SKT | KT | LGU+ | MVNO
    plan_name = Column(String, nullable=False)
    monthly_fee = Column(Integer, nullable=False)
    data_gb = Column(Float, nullable=True)  # None = 무제한
    data_unlimited = Column(Boolean, default=False)
    call_type = Column(String, default="무제한")
    is_active = Column(Boolean, default=True, nullable=False)
    is_latest = Column(Boolean, default=True, nullable=False)
    crawled_at = Column(DateTime(timezone=True), nullable=True)
    data_month = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
