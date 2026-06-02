import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash
from app.crud.user import authenticate_user, create_user, get_user_by_email
from app.models.user import User
from app.schemas.user import LoginRequest, Token, UserCreate, UserResponse

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
    normalized = raw.replace("+82 ", "0").replace("+82", "0").replace("-", "").replace(" ", "")
    return normalized if normalized.startswith("0") else None


def _upsert_kakao_user(db: Session, email: str, username: str, phone: str | None) -> User:
    user = get_user_by_email(db, email)
    if not user:
        user = User(
            email=email,
            username=username,
            hashed_password=get_password_hash(str(uuid.uuid4())),
            phone=phone,
            auth_provider='kakao',
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        changed = False
        if not user.phone and phone:
            user.phone = phone
            changed = True
        if changed:
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


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    if get_user_by_email(db, user_in.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 사용 중인 이메일입니다.")
    user = create_user(db, user_in)
    _maybe_grant_admin(db, user)
    return user


@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다.",
        )
    _maybe_grant_admin(db, user)
    access_token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=access_token)
