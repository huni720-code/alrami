from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


class UserCreate(BaseModel):
    # 식별자(아이디) = 전화번호(필수). 이메일은 선택.
    phone: str
    username: str
    email: Optional[EmailStr] = None
    password: str

    @field_validator("username")
    @classmethod
    def username_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("이름은 비워둘 수 없습니다.")
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
    phone: Optional[str] = None
    is_active: bool
    is_admin: bool
    auth_provider: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    phone: Optional[str] = None
    username: Optional[str] = None


class LoginRequest(BaseModel):
    # identifier 하나로 전화번호 또는 이메일 둘 다 허용.
    # '@' 포함 = 이메일, 아니면 전화번호로 정규화.
    identifier: str
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
    alarm_days: Optional[str] = None
    onboarding_completed: Optional[bool] = None

    @field_validator("alarm_days")
    @classmethod
    def alarm_days_valid_json(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        import json

        try:
            parsed = json.loads(v)
        except (ValueError, TypeError):
            raise ValueError("alarm_days는 JSON 배열 문자열이어야 합니다.")
        if not isinstance(parsed, list) or not all(isinstance(x, int) for x in parsed):
            raise ValueError("alarm_days는 정수 배열이어야 합니다.")
        return json.dumps(parsed)


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def new_password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("비밀번호는 8자 이상이어야 합니다.")
        return v


class ForgotPasswordRequest(BaseModel):
    phone: str


class ResetPasswordRequest(BaseModel):
    phone: str
    code: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def new_password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("비밀번호는 8자 이상이어야 합니다.")
        return v


class MessageResponse(BaseModel):
    message: str


class UserProfileResponse(BaseModel):
    telecom_carrier: Optional[str] = None
    telecom_monthly_fee: Optional[int] = None
    contract_end_date: Optional[date] = None
    card_monthly_total: Optional[int] = None
    has_ott: bool = False
    has_rental: bool = False
    rental_end_date: Optional[date] = None
    alarm_days: str = "[30, 7, 0, -7]"
    onboarding_completed: bool = False

    model_config = ConfigDict(from_attributes=True)
