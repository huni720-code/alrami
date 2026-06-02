from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class ContractSwitchLog(Base):
    __tablename__ = "contract_switch_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    contract_id = Column(
        Integer,
        ForeignKey("contracts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    category = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    switched = Column(Boolean, nullable=False)
    estimated_saving_annual = Column(Integer, nullable=True)  # 원 단위, switched=True 일 때만
    switched_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", back_populates="switch_logs")
