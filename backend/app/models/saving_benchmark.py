from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, JSON, String
from app.core.database import Base


class SavingBenchmark(Base):
    __tablename__ = "saving_benchmarks"

    id = Column(Integer, primary_key=True, index=True)
    benchmark_type = Column(String, nullable=False)   # 'card' | 'telecom'
    label = Column(String, nullable=False)
    spending_monthly = Column(Integer, nullable=True)  # monthly spending or current plan fee
    saving_monthly = Column(Integer, nullable=False)
    saving_annual = Column(Integer, nullable=False)
    best_strategy = Column(JSON, nullable=True)
    calculated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
