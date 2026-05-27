from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


CATEGORIES = [
    "식비", "교통", "쇼핑", "의료", "문화/여가",
    "주거/통신", "교육", "금융", "기타"
]


class ExpenseCreate(BaseModel):
    amount: Decimal = Field(..., gt=0, description="지출 금액")
    category: str
    description: str | None = None
    expense_date: datetime


class ExpenseUpdate(BaseModel):
    amount: Decimal | None = Field(None, gt=0)
    category: str | None = None
    description: str | None = None
    expense_date: datetime | None = None


class ExpenseResponse(BaseModel):
    id: int
    amount: Decimal
    category: str
    description: str | None
    expense_date: datetime
    user_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ExpenseSummary(BaseModel):
    total: Decimal
    by_category: dict[str, Decimal]
    count: int
