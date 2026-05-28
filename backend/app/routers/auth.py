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


def _upsert_oauth_user(db: Session, email: str, username: str) -> User:
    user = get_user_by_email(db, email)
    if not user:
        user = User(
            email=email,
            username=username,
            hashed_password=get_password_hash(str(uuid.uuid4())),
        )
        db.add(user)
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
    nickname = user_data.get("properties", {}).get("nickname") or kakao_account.get("profile", {}).get("nickname", "kakao_user")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="카카오 계정에 이메일 정보가 없습니다.")

    user = _upsert_oauth_user(db, email, nickname)
    access_token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=access_token)


@router.post("/google/callback", response_model=Token)
async def google_callback(body: OAuthCodeRequest, db: Session = Depends(get_db)):
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET or not settings.GOOGLE_REDIRECT_URI:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="구글 로그인이 설정되지 않았습니다.")
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "grant_type": "authorization_code",
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "code": body.code,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_res.status_code != 200:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="구글 토큰 교환 실패")
        google_token = token_res.json()["access_token"]

        user_res = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {google_token}"},
        )
        if user_res.status_code != 200:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="구글 사용자 정보 조회 실패")
        user_data = user_res.json()

    email = user_data.get("email")
    name = user_data.get("name") or user_data.get("given_name", "google_user")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="구글 계정에 이메일 정보가 없습니다.")

    user = _upsert_oauth_user(db, email, name)
    access_token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=access_token)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    if get_user_by_email(db, user_in.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 사용 중인 이메일입니다.")
    return create_user(db, user_in)


@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다.",
        )
    access_token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=access_token)
