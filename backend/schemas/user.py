from pydantic import BaseModel

class UserCreate(BaseModel):
    twitch_id: str
    username: str
    profile_image: str | None = None
    oauth_token: str | None = None

class UserResponse(UserCreate):
    id: int
    class Config:
        from_attributes = True   # Pydantic v2
