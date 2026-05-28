from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class UserCard(Base):
    __tablename__ = "user_cards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    card_id = Column(Integer, ForeignKey("cards.id"), nullable=False)
    nickname = Column(String, nullable=True)
    last_4_digits = Column(String(4), nullable=True)
    performance_target = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="user_cards")
    card = relationship("Card")
    transactions = relationship("CardTransaction", back_populates="user_card", cascade="all, delete-orphan")


class CardTransaction(Base):
    __tablename__ = "card_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    user_card_id = Column(Integer, ForeignKey("user_cards.id"), nullable=True)
    amount = Column(Integer, nullable=False)
    merchant = Column(String, nullable=True)
    transaction_at = Column(DateTime(timezone=True), nullable=False)
    raw_sms = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user_card = relationship("UserCard", back_populates="transactions")
