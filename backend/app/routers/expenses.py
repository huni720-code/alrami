from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.crud.expense import (
    create_expense,
    delete_expense,
    get_expense,
    get_expense_summary,
    get_expenses,
    update_expense,
)
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseResponse, ExpenseSummary, ExpenseUpdate

router = APIRouter(prefix="/expenses", tags=["지출"])


@router.get("/summary", response_model=ExpenseSummary)
def summary(
    year: int | None = Query(None),
    month: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_expense_summary(db, user_id=current_user.id, year=year, month=month)


@router.get("/", response_model=list[ExpenseResponse])
def list_expenses(
    skip: int = 0,
    limit: int = 100,
    year: int | None = Query(None),
    month: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_expenses(db, user_id=current_user.id, skip=skip, limit=limit, year=year, month=month)


@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create(
    expense_in: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_expense(db, expense_in, user_id=current_user.id)


@router.patch("/{expense_id}", response_model=ExpenseResponse)
def update(
    expense_id: int,
    expense_in: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = get_expense(db, expense_id, user_id=current_user.id)
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="지출 내역을 찾을 수 없습니다.")
    return update_expense(db, expense, expense_in)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = get_expense(db, expense_id, user_id=current_user.id)
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="지출 내역을 찾을 수 없습니다.")
    delete_expense(db, expense)
