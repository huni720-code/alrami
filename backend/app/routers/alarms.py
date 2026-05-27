from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.crud.alarm import create_alarm, delete_alarm, get_alarm, get_alarms, update_alarm
from app.models.user import User
from app.schemas.alarm import AlarmCreate, AlarmResponse, AlarmUpdate

router = APIRouter(prefix="/alarms", tags=["알람"])


@router.get("/", response_model=list[AlarmResponse])
def list_alarms(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_alarms(db, user_id=current_user.id, skip=skip, limit=limit)


@router.post("/", response_model=AlarmResponse, status_code=status.HTTP_201_CREATED)
def create(
    alarm_in: AlarmCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_alarm(db, alarm_in, user_id=current_user.id)


@router.get("/{alarm_id}", response_model=AlarmResponse)
def get_one(
    alarm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alarm = get_alarm(db, alarm_id, user_id=current_user.id)
    if not alarm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="알람을 찾을 수 없습니다.")
    return alarm


@router.patch("/{alarm_id}", response_model=AlarmResponse)
def update(
    alarm_id: int,
    alarm_in: AlarmUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alarm = get_alarm(db, alarm_id, user_id=current_user.id)
    if not alarm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="알람을 찾을 수 없습니다.")
    return update_alarm(db, alarm, alarm_in)


@router.delete("/{alarm_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    alarm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alarm = get_alarm(db, alarm_id, user_id=current_user.id)
    if not alarm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="알람을 찾을 수 없습니다.")
    delete_alarm(db, alarm)
