from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text

from app.core.database import Base


class CrawlTask(Base):
    __tablename__ = "crawl_tasks"

    id = Column(Integer, primary_key=True, index=True)
    target = Column(String, nullable=False)  # "cards" | "telecom"
    status = Column(String, default="pending")  # pending | running | completed | failed
    result_json = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    record_count = Column(Integer, default=0)
    approved = Column(Boolean, default=False)
    diff_summary = Column(JSON, nullable=True)  # {added, removed, modified} counts after approve
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime, nullable=True)
