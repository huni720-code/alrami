from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    username = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    # 식별자(아이디) = 전화번호. nullable unique(Postgres: 다중 NULL 허용).
    phone = Column(Text, unique=True, index=True, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    auth_provider = Column(String, default='email', server_default='email', nullable=False)
    reset_code = Column(String, nullable=True)
    reset_code_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    alarms = relationship("Alarm", back_populates="user", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="user", cascade="all, delete-orphan")
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    user_cards = relationship("UserCard", back_populates="user", cascade="all, delete-orphan")
    consent = relationship("UserConsent", back_populates="user", uselist=False, cascade="all, delete-orphan")
    contracts = relationship("Contract", back_populates="user", cascade="all, delete-orphan")
    switch_logs = relationship("ContractSwitchLog", back_populates="user", cascade="all, delete-orphan")
