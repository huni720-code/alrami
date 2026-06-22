from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.market_benchmark import MarketBenchmark
from app.models.user import User

router = APIRouter(prefix="/benchmarks", tags=["벤치마크"])


class MarketBenchmarkResponse(BaseModel):
    category: str
    reattach_subsidy_approx: Optional[int]
    new_subsidy_approx: Optional[int]
    discount_note: Optional[str]
    source: Optional[str]
    effective_month: Optional[str]

    model_config = ConfigDict(from_attributes=True)


@router.get("/market", response_model=List[MarketBenchmarkResponse])
def get_market_benchmarks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # noqa: ARG001
):
    """카테고리별 최신 '대략' 벤치마크. 항상 is_latest 행만 반환 → 어드민이 갱신하면 즉시 반영."""
    rows = (
        db.query(MarketBenchmark)
        .filter(MarketBenchmark.is_latest == True)  # noqa: E712
        .all()
    )
    return rows
