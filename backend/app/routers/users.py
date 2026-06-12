from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.phone import InvalidPhoneError, normalize_phone
from app.core.security import get_password_hash, verify_password
from app.crud.user import get_user_by_phone
from app.models.user import User
from app.models.user_profile import UserProfile
from app.schemas.user import (
    PasswordChangeRequest,
    UserProfileResponse,
    UserProfileUpdate,
    UserResponse,
    UserUpdate,
)

router = APIRouter(prefix="/users", tags=["사용자"])


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_me(
    body: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    update_data = body.model_dump(exclude_unset=True)
    # phone(아이디) 변경 시 정규화 + 타 계정 중복 검사.
    if "phone" in update_data:
        raw = update_data.pop("phone")
        if raw is None or str(raw).strip() == "":
            raise HTTPException(status_code=422, detail="전화번호는 비워둘 수 없어요.")
        try:
            phone = normalize_phone(str(raw))
        except InvalidPhoneError as e:
            raise HTTPException(status_code=422, detail=str(e))
        existing = get_user_by_phone(db, phone)
        if existing and existing.id != current_user.id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 가입된 번호예요")
        current_user.phone = phone
    for field, value in update_data.items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/me/profile", response_model=UserProfileResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if profile is None:
        return UserProfileResponse()
    return profile


@router.patch("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    body: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="현재 비밀번호가 올바르지 않아요.")
    current_user.hashed_password = get_password_hash(body.new_password)
    db.commit()


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.is_active = False
    db.commit()


@router.patch("/me/profile", response_model=UserProfileResponse)
def update_my_profile(
    body: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    now = datetime.now(timezone.utc)

    if profile is None:
        profile = UserProfile(user_id=current_user.id, created_at=now, updated_at=now)
        db.add(profile)

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)
    profile.updated_at = now

    db.commit()
    db.refresh(profile)
    return profile
