from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class RoomBase(BaseModel):
    name: str
    theme: str
    language: str = "EN"

class RoomCreate(RoomBase):
    pass

class RoomUpdate(BaseModel):
    name: Optional[str] = None
    theme: Optional[str] = None
    language: Optional[str] = None
    is_active: Optional[bool] = None

class RoomResponse(RoomBase):
    id: int
    is_active: bool
    created_by: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class RoomList(BaseModel):
    rooms: list[RoomResponse]
    total: int
