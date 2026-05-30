from calendar import monthrange
from datetime import date, datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.contract import Contract
from app.models.provider_info import ProviderInfo
from app.models.user import User
from app.schemas.contract import ContractCreate, ContractResponse, ContractUpdate, ProviderInfoResponse

router = APIRouter(prefix="/contracts", tags=["약정"])


def _add_months(d: date, months: int) -> date:
    """start_date + term_months → end_date. 월말 오버플로우 처리."""
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    day = min(d.day, monthrange(year, month)[1])
    return date(year, month, day)


def _dday(end_date: date) -> int:
    today = datetime.now(timezone.utc).date()
    return (end_date - today).days


def _to_response(c: Contract) -> dict:
    return {
        "id": c.id,
        "category": c.category,
        "provider": c.provider,
        "start_date": c.start_date,
        "term_months": c.term_months,
        "monthly_fee": c.monthly_fee,
        "penalty_fee": c.penalty_fee,
        "device_subsidy": c.device_subsidy,
        "end_date": c.end_date,
        "accuracy": c.accuracy,
        "is_active": c.is_active,
        "dday": _dday(c.end_date),
    }


# ── 약정 목록 ─────────────────────────────────────────────────

@router.get("", response_model=List[ContractResponse])
def list_contracts(
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Contract).filter(Contract.user_id == current_user.id)
    if active_only:
        q = q.filter(Contract.is_active == True)  # noqa: E712
    contracts = q.order_by(Contract.end_date.asc()).all()
    return [_to_response(c) for c in contracts]


# ── 약정 추가 ─────────────────────────────────────────────────

@router.post("", response_model=ContractResponse, status_code=status.HTTP_201_CREATED)
def create_contract(
    body: ContractCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    end_date = _add_months(body.start_date, body.term_months)
    contract = Contract(
        user_id=current_user.id,
        category=body.category,
        provider=body.provider,
        start_date=body.start_date,
        term_months=body.term_months,
        monthly_fee=body.monthly_fee,
        penalty_fee=body.penalty_fee,
        device_subsidy=body.device_subsidy,
        end_date=end_date,
        accuracy=body.accuracy,
        is_active=True,
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)
    return _to_response(contract)


# ── 약정 수정 ─────────────────────────────────────────────────

@router.patch("/{contract_id}", response_model=ContractResponse)
def update_contract(
    contract_id: int,
    body: ContractUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contract = db.query(Contract).filter(
        Contract.id == contract_id,
        Contract.user_id == current_user.id,
    ).first()
    if not contract:
        raise HTTPException(status_code=404, detail="약정을 찾을 수 없습니다.")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(contract, field, value)

    # start_date나 term_months가 바뀌었으면 end_date 재계산
    if body.start_date is not None or body.term_months is not None:
        sd = contract.start_date
        tm = contract.term_months
        if sd and tm:
            contract.end_date = _add_months(sd, tm)

    contract.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(contract)
    return _to_response(contract)


# ── 약정 삭제 ─────────────────────────────────────────────────

@router.delete("/{contract_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contract = db.query(Contract).filter(
        Contract.id == contract_id,
        Contract.user_id == current_user.id,
    ).first()
    if not contract:
        raise HTTPException(status_code=404, detail="약정을 찾을 수 없습니다.")
    db.delete(contract)
    db.commit()


# ── 약정 확인 도우미 (provider_info) ─────────────────────────

@router.get("/provider-info", response_model=List[ProviderInfoResponse])
def list_provider_info(
    provider: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # noqa: ARG001
):
    q = db.query(ProviderInfo)
    if provider:
        q = q.filter(ProviderInfo.provider.ilike(f"%{provider}%"))
    return q.order_by(ProviderInfo.provider).all()
