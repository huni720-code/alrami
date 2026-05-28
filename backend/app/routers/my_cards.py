from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.product import Card
from app.models.user import User
from app.models.user_card import CardTransaction, UserCard
from app.services.sms_parser import parse_card_sms

router = APIRouter(prefix="/my-cards", tags=["내 카드"])


# ── 카드 카탈로그 (카드 추가 검색용) ─────────────────────────

@router.get("/card-catalog")
def card_catalog(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # noqa: ARG001
):
    cards = (
        db.query(Card)
        .filter(Card.is_latest == True)  # noqa: E712
        .order_by(Card.company, Card.name)
        .all()
    )
    return [
        {
            "id": c.id,
            "name": c.name,
            "company": c.company,
            "annual_fee": c.annual_fee,
        }
        for c in cards
    ]


# ── 스키마 ────────────────────────────────────────────────────

class UserCardCreate(BaseModel):
    card_id: int
    nickname: Optional[str] = None
    last_4_digits: Optional[str] = None
    performance_target: Optional[int] = None


class SmsParseRequest(BaseModel):
    raw_sms: str


# ── 헬퍼 ─────────────────────────────────────────────────────

def _month_spent(db: Session, user_card_id: int, year: int, month: int) -> int:
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(year, month + 1, 1, tzinfo=timezone.utc)
    total = (
        db.query(func.coalesce(func.sum(CardTransaction.amount), 0))
        .filter(
            CardTransaction.user_card_id == user_card_id,
            CardTransaction.transaction_at >= start,
            CardTransaction.transaction_at < end,
        )
        .scalar()
    )
    return int(total or 0)


def _card_summary(db: Session, uc: UserCard, today: date) -> dict:
    spent = _month_spent(db, uc.id, today.year, today.month)
    target = uc.performance_target or 0
    remaining = max(0, target - spent)
    return {
        "id": uc.id,
        "card_id": uc.card_id,
        "card_name": uc.card.name if uc.card else "",
        "card_company": uc.card.company if uc.card else "",
        "nickname": uc.nickname,
        "last_4_digits": uc.last_4_digits,
        "performance_target": uc.performance_target,
        "this_month_spent": spent,
        "remaining": remaining,
        "achieved": bool(target and spent >= target),
    }


# ── 엔드포인트 ────────────────────────────────────────────────

@router.get("")
def list_my_cards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    cards = (
        db.query(UserCard)
        .filter(UserCard.user_id == current_user.id)
        .order_by(UserCard.created_at)
        .all()
    )
    return [_card_summary(db, uc, today) for uc in cards]


@router.post("", status_code=status.HTTP_201_CREATED)
def add_my_card(
    body: UserCardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = db.query(Card).filter(Card.id == body.card_id).first()
    if not card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="카드를 찾을 수 없습니다.")

    dup = (
        db.query(UserCard)
        .filter(UserCard.user_id == current_user.id, UserCard.card_id == body.card_id)
        .first()
    )
    if dup:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 등록된 카드입니다.")

    uc = UserCard(
        user_id=current_user.id,
        card_id=body.card_id,
        nickname=body.nickname,
        last_4_digits=body.last_4_digits,
        performance_target=body.performance_target,
    )
    db.add(uc)
    db.commit()
    db.refresh(uc)
    return _card_summary(db, uc, date.today())


@router.delete("/{user_card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_card(
    user_card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uc = (
        db.query(UserCard)
        .filter(UserCard.id == user_card_id, UserCard.user_id == current_user.id)
        .first()
    )
    if not uc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="카드를 찾을 수 없습니다.")
    db.delete(uc)
    db.commit()


@router.post("/parse-sms")
def parse_sms(
    body: SmsParseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    parsed = parse_card_sms(body.raw_sms)
    if not parsed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="카드 결제 문자를 인식하지 못했습니다.",
        )

    # last_4_digits 로 내 카드 매칭
    matched_uc: Optional[UserCard] = None
    if parsed["last_4_digits"]:
        matched_uc = (
            db.query(UserCard)
            .filter(
                UserCard.user_id == current_user.id,
                UserCard.last_4_digits == parsed["last_4_digits"],
            )
            .first()
        )

    tx = CardTransaction(
        user_id=current_user.id,
        user_card_id=matched_uc.id if matched_uc else None,
        amount=parsed["amount"],
        merchant=parsed["merchant"],
        transaction_at=parsed["transaction_at"],
        raw_sms=body.raw_sms,
    )
    db.add(tx)
    db.commit()

    if not matched_uc:
        return {
            "parsed": {
                "card_company": parsed["card_company"],
                "amount": parsed["amount"],
                "merchant": parsed["merchant"],
            },
            "matched_card": None,
            "message": "결제 내역이 저장됐어요.",
        }

    today = date.today()
    summary = _card_summary(db, matched_uc, today)
    target = summary["performance_target"] or 0
    spent = summary["this_month_spent"]
    remaining = summary["remaining"]
    card_name = summary["card_name"]

    if summary["achieved"]:
        message = f"{card_name} 이번달 {spent:,}원 / 목표 {target:,}원, 실적 달성 완료!"
    else:
        message = f"{card_name} 이번달 {spent:,}원 / 목표 {target:,}원, {remaining:,}원 더 쓰면 달성!"

    return {
        "parsed": {
            "card_company": parsed["card_company"],
            "amount": parsed["amount"],
            "merchant": parsed["merchant"],
        },
        "matched_card": {
            "card_name": card_name,
            "this_month_spent": spent,
            "performance_target": target,
            "remaining": remaining,
            "achieved": summary["achieved"],
        },
        "message": message,
    }


@router.get("/transactions")
def list_transactions(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    y = year or today.year
    m = month or today.month

    start = datetime(y, m, 1, tzinfo=timezone.utc)
    end = datetime(y + 1, 1, 1, tzinfo=timezone.utc) if m == 12 else datetime(y, m + 1, 1, tzinfo=timezone.utc)

    rows = (
        db.query(CardTransaction)
        .filter(
            CardTransaction.user_id == current_user.id,
            CardTransaction.transaction_at >= start,
            CardTransaction.transaction_at < end,
        )
        .order_by(CardTransaction.transaction_at.desc())
        .all()
    )

    result = []
    for tx in rows:
        card_name = None
        if tx.user_card_id and tx.user_card:
            card_name = tx.user_card.card.name if tx.user_card.card else None
        result.append(
            {
                "id": tx.id,
                "user_card_id": tx.user_card_id,
                "card_name": card_name,
                "amount": tx.amount,
                "merchant": tx.merchant,
                "transaction_at": tx.transaction_at.isoformat(),
            }
        )
    return result
