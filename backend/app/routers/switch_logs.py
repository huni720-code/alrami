from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.contract import Contract
from app.models.contract_switch_log import ContractSwitchLog
from app.models.user import User
from app.schemas.contract_switch_log import SwitchLogCreate, SwitchLogResponse, SwitchLogSummary

router = APIRouter(prefix="/switch-logs", tags=["전환기록"])


@router.post("", response_model=SwitchLogResponse, status_code=status.HTTP_201_CREATED)
def create_switch_log(
    body: SwitchLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = ContractSwitchLog(
        user_id=current_user.id,
        contract_id=body.contract_id,
        category=body.category,
        provider=body.provider,
        switched=body.switched,
        # 절감액은 갈아탔을 때만 기록
        estimated_saving_annual=body.estimated_saving_annual if body.switched else None,
    )
    db.add(log)

    # "예"면 해당 약정을 비활성화 (감시 완료)
    if body.switched and body.contract_id:
        contract = db.query(Contract).filter(
            Contract.id == body.contract_id,
            Contract.user_id == current_user.id,
        ).first()
        if contract:
            contract.is_active = False

    db.commit()
    db.refresh(log)
    return log


@router.get("", response_model=List[SwitchLogResponse])
def list_switch_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(ContractSwitchLog)
        .filter(ContractSwitchLog.user_id == current_user.id)
        .order_by(ContractSwitchLog.switched_at.desc())
        .all()
    )


@router.get("/summary", response_model=SwitchLogSummary)
def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logs = (
        db.query(ContractSwitchLog)
        .filter(
            ContractSwitchLog.user_id == current_user.id,
            ContractSwitchLog.switched == True,  # noqa: E712
        )
        .all()
    )
    return {
        "switch_count": len(logs),
        "total_saving_annual": sum(log.estimated_saving_annual or 0 for log in logs),
    }
