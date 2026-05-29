from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("사용자명은 비워둘 수 없습니다.")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("비밀번호는 8자 이상이어야 합니다.")
        return v


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    is_active: bool
    is_admin: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserProfileUpdate(BaseModel):
    telecom_carrier: Optional[str] = None
    telecom_monthly_fee: Optional[int] = None
    contract_end_date: Optional[date] = None
    card_monthly_total: Optional[int] = None
    has_ott: Optional[bool] = None
    has_rental: Optional[bool] = None
    rental_end_date: Optional[date] = None
    onboarding_completed: Optional[bool] = None


class UserProfileResponse(BaseModel):
    telecom_carrier: Optional[str] = None
    telecom_monthly_fee: Optional[int] = None
    contract_end_date: Optional[date] = None
    card_monthly_total: Optional[int] = None
    has_ott: bool = False
    has_rental: bool = False
    rental_end_date: Optional[date] = None
    onboarding_completed: bool = False

    model_config = ConfigDict(from_attributes=True)
