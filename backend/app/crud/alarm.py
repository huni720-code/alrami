from sqlalchemy.orm import Session

from app.models.alarm import Alarm
from app.schemas.alarm import AlarmCreate, AlarmUpdate


def get_alarms(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> list[Alarm]:
    return (
        db.query(Alarm)
        .filter(Alarm.user_id == user_id)
        .order_by(Alarm.alarm_time)
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_alarm(db: Session, alarm_id: int, user_id: int) -> Alarm | None:
    return db.query(Alarm).filter(Alarm.id == alarm_id, Alarm.user_id == user_id).first()


def create_alarm(db: Session, alarm_in: AlarmCreate, user_id: int) -> Alarm:
    alarm = Alarm(**alarm_in.model_dump(), user_id=user_id)
    db.add(alarm)
    db.commit()
    db.refresh(alarm)
    return alarm


def update_alarm(db: Session, alarm: Alarm, alarm_in: AlarmUpdate) -> Alarm:
    update_data = alarm_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(alarm, field, value)
    db.commit()
    db.refresh(alarm)
    return alarm


def delete_alarm(db: Session, alarm: Alarm) -> None:
    db.delete(alarm)
    db.commit()
