from datetime import datetime
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.schemas.expense import ExpenseCreate, ExpenseSummary, ExpenseUpdate


def get_expenses(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 100,
    year: int | None = None,
    month: int | None = None,
) -> list[Expense]:
    q = db.query(Expense).filter(Expense.user_id == user_id)
    if year:
        q = q.filter(func.extract("year", Expense.expense_date) == year)
    if month:
        q = q.filter(func.extract("month", Expense.expense_date) == month)
    return q.order_by(Expense.expense_date.desc()).offset(skip).limit(limit).all()


def get_expense(db: Session, expense_id: int, user_id: int) -> Expense | None:
    return db.query(Expense).filter(Expense.id == expense_id, Expense.user_id == user_id).first()


def create_expense(db: Session, expense_in: ExpenseCreate, user_id: int) -> Expense:
    expense = Expense(
        amount=expense_in.amount,
        category=expense_in.category,
        description=expense_in.description,
        expense_date=expense_in.expense_date,
        user_id=user_id,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


def update_expense(db: Session, expense: Expense, expense_in: ExpenseUpdate) -> Expense:
    data = expense_in.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(expense, field, value)
    db.commit()
    db.refresh(expense)
    return expense


def delete_expense(db: Session, expense: Expense) -> None:
    db.delete(expense)
    db.commit()


def get_expense_summary(
    db: Session,
    user_id: int,
    year: int | None = None,
    month: int | None = None,
) -> ExpenseSummary:
    q = db.query(Expense).filter(Expense.user_id == user_id)
    if year:
        q = q.filter(func.extract("year", Expense.expense_date) == year)
    if month:
        q = q.filter(func.extract("month", Expense.expense_date) == month)
    expenses = q.all()

    total = sum(e.amount for e in expenses)
    by_category: dict[str, Decimal] = {}
    for e in expenses:
        by_category[e.category] = by_category.get(e.category, Decimal(0)) + e.amount

    return ExpenseSummary(total=total, by_category=by_category, count=len(expenses))
