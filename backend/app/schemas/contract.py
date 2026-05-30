from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, field_validator

VALID_CATEGORIES = {"휴대폰", "인터넷", "TV", "정수기", "비데", "렌탈가전"}
VALID_ACCURACY = {"estimated", "confirmed"}


class ContractCreate(BaseModel):
    category: str
    provider: str
    start_date: date
    term_months: int
    monthly_fee: Optional[int] = None
    penalty_fee: Optional[int] = None
    device_subsidy: Optional[int] = None
    accuracy: Literal["estimated", "confirmed"] = "estimated"

    @field_validator("category")
    @classmethod
    def category_valid(cls, v: str) -> str:
        if v not in VALID_CATEGORIES:
            raise ValueError(f"category는 {VALID_CATEGORIES} 중 하나여야 합니다.")
        return v

    @field_validator("term_months")
    @classmethod
    def term_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("term_months는 1 이상이어야 합니다.")
        return v


class ContractUpdate(BaseModel):
    category: Optional[str] = None
    provider: Optional[str] = None
    start_date: Optional[date] = None
    term_months: Optional[int] = None
    monthly_fee: Optional[int] = None
    penalty_fee: Optional[int] = None
    device_subsidy: Optional[int] = None
    accuracy: Optional[Literal["estimated", "confirmed"]] = None
    is_active: Optional[bool] = None


class ContractResponse(BaseModel):
    id: int
    category: str
    provider: str
    start_date: Optional[date]
    term_months: Optional[int]
    monthly_fee: Optional[int]
    penalty_fee: Optional[int]
    device_subsidy: Optional[int]
    end_date: date
    accuracy: str
    is_active: bool
    dday: int           # 양수=남은 일수, 0=당일, 음수=초과

    model_config = ConfigDict(from_attributes=True)


class ProviderInfoResponse(BaseModel):
    provider: str
    short_number: Optional[str]
    center_number: Optional[str]
    app_name: Optional[str]
    check_path: Optional[str]
    category_hint: Optional[str]

    model_config = ConfigDict(from_attributes=True)
