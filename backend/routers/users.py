from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db import get_db
from models.user import User
from schemas.user import UserCreate, UserResponse

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/", response_model=UserResponse)
def upsert_user(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.twitch_id == user.twitch_id).first()
    if existing:
        existing.username = user.username
        existing.profile_image = user.profile_image
        existing.oauth_token = user.oauth_token
        db.commit()
        db.refresh(existing)
        return existing

    new_user = User(**user.dict())
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.get("/", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()
