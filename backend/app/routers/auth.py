import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.phone import InvalidPhoneError, normalize_phone, try_normalize_phone
from app.core.security import create_access_token, get_password_hash, verify_password
from app.crud.user import (
    authenticate_with_user,
    create_user,
    get_user_by_email,
    get_user_by_phone,
)
from app.models.user import User
from app.schemas.user import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    ResetPasswordRequest,
    Token,
    UserCreate,
    UserResponse,
)
from app.services.notification import send_sms

logger = logging.getLogger(__name__)

RESET_CODE_TTL_MINUTES = 10

router = APIRouter(prefix="/auth", tags=["인증"])


class OAuthCodeRequest(BaseModel):
    code: str


def _maybe_grant_admin(db: Session, user: User) -> None:
    if settings.ADMIN_EMAIL and user.email == settings.ADMIN_EMAIL and not user.is_admin:
        user.is_admin = True
        db.commit()


def _normalize_kakao_phone(raw: str | None) -> str | None:
    if not raw:
        return None
    # Kakao returns "+82 10-xxxx-xxxx" → "010xxxxxxxx"
    pre = raw.replace("+82 ", "0").replace("+82", "0")
    # 숫자만 남기고 010 10~11자리 검증(실패 시 None — best-effort).
    return try_normalize_phone(pre)


def _upsert_kakao_user(db: Session, email: str, username: str, phone: str | None) -> User:
    user = get_user_by_email(db, email)
    if not user:
        # 보안: 카카오 phone 이 이미 다른 계정에 쓰이면 자동 병합/연결하지 않는다.
        # (계정 탈취 리스크) → phone 을 비워두고 가입 진행. 사용자가 내 정보에서 직접 등록.
        safe_phone = phone
        if phone and get_user_by_phone(db, phone):
            safe_phone = None
        user = User(
            email=email,
            username=username,
            hashed_password=get_password_hash(str(uuid.uuid4())),
            phone=safe_phone,
            auth_provider='kakao',
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # 기존 계정에 phone 이 없고, 그 phone 이 타 계정에 안 쓰일 때만 채운다.
        if not user.phone and phone and not get_user_by_phone(db, phone):
            user.phone = phone
            db.commit()
            db.refresh(user)
    return user


@router.post("/kakao/callback", response_model=Token)
async def kakao_callback(body: OAuthCodeRequest, db: Session = Depends(get_db)):
    if not settings.KAKAO_CLIENT_ID or not settings.KAKAO_REDIRECT_URI:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="카카오 로그인이 설정되지 않았습니다.")
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://kauth.kakao.com/oauth/token",
            data={
                "grant_type": "authorization_code",
                "client_id": settings.KAKAO_CLIENT_ID,
                "redirect_uri": settings.KAKAO_REDIRECT_URI,
                "code": body.code,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_res.status_code != 200:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="카카오 토큰 교환 실패")
        kakao_token = token_res.json()["access_token"]

        user_res = await client.get(
            "https://kapi.kakao.com/v2/user/me",
            headers={"Authorization": f"Bearer {kakao_token}"},
        )
        if user_res.status_code != 200:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="카카오 사용자 정보 조회 실패")
        user_data = user_res.json()

    kakao_account = user_data.get("kakao_account", {})
    email = kakao_account.get("email")
    nickname = (
        user_data.get("properties", {}).get("nickname")
        or kakao_account.get("profile", {}).get("nickname", "카카오사용자")
    )
    phone = _normalize_kakao_phone(kakao_account.get("phone_number"))

    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="카카오 계정에 이메일 정보가 없습니다.")

    user = _upsert_kakao_user(db, email, nickname, phone)
    _maybe_grant_admin(db, user)
    access_token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=access_token)


_GENERIC_FORGOT_MESSAGE = "등록된 번호면 인증코드를 보냈어요"
_RESET_FAILURE_MESSAGE = "인증코드가 올바르지 않거나 만료됐어요"


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    # 번호 존재 여부를 노출하지 않기 위해 항상 동일한 200 응답.
    # 형식 오류여도(정규화 실패) 동일 메시지 반환 → 열거 방지.
    phone = try_normalize_phone(body.phone)
    user = get_user_by_phone(db, phone) if phone else None
    if user:
        # 6자리 숫자 코드 생성 → 해시 저장(평문 저장 금지). 만료 10분.
        code = f"{secrets.randbelow(1_000_000):06d}"
        user.reset_code = get_password_hash(code)
        user.reset_code_expires = datetime.now(timezone.utc) + timedelta(
            minutes=RESET_CODE_TTL_MINUTES
        )
        db.commit()
        # 개발 중 자가 확인용: SMS_API_KEY 미설정이면 send_sms가 [SMS-DEV] 로그만 찍는다.
        text = f"[만기톡] 비밀번호 재설정 인증코드: {code} ({RESET_CODE_TTL_MINUTES}분 유효)"
        await send_sms(phone, text)
    return MessageResponse(message=_GENERIC_FORGOT_MESSAGE)


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    phone = try_normalize_phone(body.phone)
    user = get_user_by_phone(db, phone) if phone else None
    failure = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST, detail=_RESET_FAILURE_MESSAGE
    )
    if not user or not user.reset_code or not user.reset_code_expires:
        raise failure

    expires = user.reset_code_expires
    # DB에서 읽은 naive datetime을 UTC로 간주해 비교(저장 시 UTC 사용).
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise failure

    if not verify_password(body.code, user.reset_code):
        raise failure

    # 성공: 비밀번호 갱신 + 코드 즉시 소멸(1회용).
    user.hashed_password = get_password_hash(body.new_password)
    user.reset_code = None
    user.reset_code_expires = None
    db.commit()
    return MessageResponse(message="비밀번호를 바꿨어요")


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # 식별자 = 전화번호(필수). 정규화 후 중복 검사.
    try:
        phone = normalize_phone(user_in.phone)
    except InvalidPhoneError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    if get_user_by_phone(db, phone):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 가입된 번호예요")
    # 이메일은 선택 — 입력 시 중복 검사.
    if user_in.email and get_user_by_email(db, user_in.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 사용 중인 이메일입니다.")
    user = create_user(db, user_in, phone)
    _maybe_grant_admin(db, user)
    return user


@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    # identifier: '@' 포함이면 이메일, 아니면 전화번호로 정규화.
    identifier = login_data.identifier.strip()
    if "@" in identifier:
        user = get_user_by_email(db, identifier)
    else:
        phone = try_normalize_phone(identifier)
        user = get_user_by_phone(db, phone) if phone else None
    user = authenticate_with_user(db, user, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="전화번호 또는 비밀번호가 올바르지 않습니다.",
        )
    _maybe_grant_admin(db, user)
    access_token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=access_token)
