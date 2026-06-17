from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

VALID_CATEGORIES = {"휴대폰", "인터넷", "TV", "정수기", "비데", "렌탈가전"}


class ContractCreate(BaseModel):
    category: str
    provider: str
    # 두 경로: (1) start_date + term_months → end_date 계산  (2) end_date 직접 입력(confirmed)
    start_date: Optional[date] = None
    term_months: Optional[int] = None
    end_date: Optional[date] = None   # 직접 입력 시 계산 생략
    monthly_fee: Optional[int] = None
    penalty_fee: Optional[int] = None
    device_subsidy: Optional[int] = None
    owner_label: Optional[str] = None  # 가족 라벨: 나/엄마/아빠/배우자/자녀/집
    accuracy: Literal["estimated", "confirmed"] = "estimated"

    @field_validator("category")
    @classmethod
    def category_valid(cls, v: str) -> str:
        if v not in VALID_CATEGORIES:
            raise ValueError(f"category는 {VALID_CATEGORIES} 중 하나여야 합니다.")
        return v

    @field_validator("term_months")
    @classmethod
    def term_positive(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v <= 0:
            raise ValueError("term_months는 1 이상이어야 합니다.")
        return v

    @field_validator("monthly_fee")
    @classmethod
    def fee_range(cls, v: Optional[int]) -> Optional[int]:
        # 원 단위. 만원 단위 오입력(×10000) 방지용 상한
        if v is not None and not (0 <= v <= 2_000_000):
            raise ValueError("monthly_fee는 0~2,000,000원 범위여야 합니다.")
        return v

    @model_validator(mode="after")
    def validate_date_fields(self) -> "ContractCreate":
        if self.end_date is None and (self.start_date is None or self.term_months is None):
            raise ValueError("end_date 직접 입력 또는 start_date + term_months 조합이 필요합니다.")
        return self


class ContractUpdate(BaseModel):
    category: Optional[str] = None
    provider: Optional[str] = None
    start_date: Optional[date] = None
    term_months: Optional[int] = None
    end_date: Optional[date] = None   # confirmed 승격 시 직접 override
    monthly_fee: Optional[int] = None
    penalty_fee: Optional[int] = None
    device_subsidy: Optional[int] = None
    owner_label: Optional[str] = None
    accuracy: Optional[Literal["estimated", "confirmed"]] = None
    is_active: Optional[bool] = None
    decision: Optional[Literal["keep", "switch"]] = None

    @field_validator("monthly_fee")
    @classmethod
    def fee_range(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (0 <= v <= 2_000_000):
            raise ValueError("monthly_fee는 0~2,000,000원 범위여야 합니다.")
        return v


class ContractResponse(BaseModel):
    id: int
    category: str
    provider: str
    start_date: Optional[date]
    term_months: Optional[int]
    monthly_fee: Optional[int]
    penalty_fee: Optional[int]
    device_subsidy: Optional[int]
    owner_label: Optional[str]
    end_date: date
    accuracy: str
    is_active: bool
    dday: int  # 양수=남은 일수, 0=당일, 음수=초과
    status: str  # 여유 | 점검 | 임박 | 지남 (백엔드 판정)
    decision: Optional[str] = None  # keep | switch | None

    model_config = ConfigDict(from_attributes=True)


class ProviderInfoResponse(BaseModel):
    provider: str
    short_number: Optional[str]
    center_number: Optional[str]
    app_name: Optional[str]
    check_path: Optional[str]
    category_hint: Optional[str]

    model_config = ConfigDict(from_attributes=True)
