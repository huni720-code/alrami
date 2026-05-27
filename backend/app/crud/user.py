from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password, _prehash
from app.models.user import User
from app.schemas.user import UserCreate

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def get_user(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def create_user(db: Session, user_in: UserCreate) -> User:
    user = User(
        email=user_in.email,
        username=user_in.username,
        hashed_password=get_password_hash(user_in.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if user is None:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    # 구형 해시(SHA-256 없이 저장)로 로그인 성공 시 새 방식으로 재해싱
    try:
        is_new_hash = _pwd_ctx.verify(_prehash(password), user.hashed_password)
    except Exception:
        is_new_hash = False
    if not is_new_hash:
        user.hashed_password = get_password_hash(password)
        db.commit()
    return user
