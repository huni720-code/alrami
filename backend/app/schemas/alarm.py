from datetime import datetime, time
from typing import Annotated

from pydantic import BaseModel, Field, field_validator


class AlarmCreate(BaseModel):
    title: str
    description: str | None = None
    alarm_time: time
    days_of_week: Annotated[list[int], Field(default_factory=list)]
    is_active: bool = True

    @field_validator("days_of_week")
    @classmethod
    def validate_days(cls, v: list[int]) -> list[int]:
        if not all(0 <= d <= 6 for d in v):
            raise ValueError("요일은 0(월)~6(일) 사이 값이어야 합니다.")
        return sorted(set(v))

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("알람 제목은 비워둘 수 없습니다.")
        return v.strip()


class AlarmUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    alarm_time: time | None = None
    days_of_week: list[int] | None = None
    is_active: bool | None = None

    @field_validator("days_of_week")
    @classmethod
    def validate_days(cls, v: list[int] | None) -> list[int] | None:
        if v is not None and not all(0 <= d <= 6 for d in v):
            raise ValueError("요일은 0(월)~6(일) 사이 값이어야 합니다.")
        return sorted(set(v)) if v is not None else v


class AlarmResponse(BaseModel):
    id: int
    title: str
    description: str | None
    alarm_time: time
    days_of_week: list[int]
    is_active: bool
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
