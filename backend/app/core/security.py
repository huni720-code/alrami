import base64
import hashlib
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _prehash(password: str) -> str:
    # bcrypt 72바이트 제한 우회: SHA-256으로 사전 해싱
    return base64.b64encode(hashlib.sha256(password.encode()).digest()).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    # 새 방식(SHA-256 사전 해싱) 먼저 시도
    if pwd_context.verify(_prehash(plain_password), hashed_password):
        return True
    # 구형 해시(SHA-256 없이 저장된 경우) 폴백
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    return pwd_context.hash(_prehash(password))


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
