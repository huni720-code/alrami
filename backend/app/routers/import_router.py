from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.expense import Expense
from app.models.user import User

router = APIRouter(prefix="/import", tags=["import"])


class ImportExpenseItem(BaseModel):
    date: str  # YYYY-MM-DD
    card_company: Optional[str] = None
    merchant: str
    amount: float
    category: str
    description: str


class ImportExpensesRequest(BaseModel):
    items: list[ImportExpenseItem]


class ImportExpensesResponse(BaseModel):
    saved: int
    errors: int
    total: int


@router.post("/expenses", response_model=ImportExpensesResponse)
def import_expenses(
    body: ImportExpensesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    saved = 0
    errors = 0
    for item in body.items:
        try:
            expense = Expense(
                amount=item.amount,
                category=item.category,
                description=item.description,
                expense_date=datetime.fromisoformat(f"{item.date}T00:00:00"),
                user_id=current_user.id,
            )
            db.add(expense)
            db.commit()
            saved += 1
        except Exception:
            db.rollback()
            errors += 1
    return ImportExpensesResponse(saved=saved, errors=errors, total=len(body.items))
