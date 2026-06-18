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
    twitch_channel: Optional[str] = None
    twitch_channel_id: Optional[str] = None
    
    class Config:
        from_attributes = True

class RoomList(BaseModel):
    rooms: list[RoomResponse]
    total: int

class ActiveRoomLookupResponse(BaseModel):
    active: bool
    room: Optional[RoomResponse] = None
