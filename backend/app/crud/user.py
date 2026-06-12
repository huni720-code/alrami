from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password, _prehash
from app.models.user import User
from app.schemas.user import UserCreate

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_user_by_email(db: Session, email: str) -> User | None:
    if not email:
        return None
    return db.query(User).filter(User.email == email).first()


def get_user_by_phone(db: Session, phone: str) -> User | None:
    if not phone:
        return None
    return db.query(User).filter(User.phone == phone).first()


def get_user(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def create_user(db: Session, user_in: UserCreate, phone: str) -> User:
    # phone 은 라우터에서 정규화·중복검사를 마친 값을 받는다.
    user = User(
        email=user_in.email,
        username=user_in.username,
        hashed_password=get_password_hash(user_in.password),
        phone=phone,
        auth_provider='email',
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_with_user(db: Session, user: User | None, password: str) -> User | None:
    """이미 조회된 user 로 비밀번호 검증(전화번호/이메일 공통 경로)."""
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


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    """하위호환: 이메일로 인증. 신규 경로는 authenticate_with_user 사용."""
    return authenticate_with_user(db, get_user_by_email(db, email), password)
