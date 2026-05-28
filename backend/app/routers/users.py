from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.user_profile import UserProfile
from app.schemas.user import UserProfileResponse, UserProfileUpdate, UserResponse

router = APIRouter(prefix="/users", tags=["사용자"])


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
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
