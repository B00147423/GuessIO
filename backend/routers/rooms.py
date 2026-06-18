from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from db import get_db
from models.room import Room
from models.user import User
from schemas.room import (
    RoomCreate,
    RoomUpdate,
    RoomResponse,
    RoomList,
    ActiveRoomLookupResponse,
)
from api.auth import get_current_user
from routers.room_helpers import (
    deactivate_other_rooms_for_streamer,
    find_active_room_by_channel,
)

router = APIRouter(prefix="/api/rooms", tags=["rooms"])


@router.get("/", response_model=RoomList)
async def get_rooms(
    skip: int = 0,
    limit: int = 100,
    theme: str = None,
    language: str = None,
    db: Session = Depends(get_db),
):
    """Get all active rooms with optional filtering"""
    query = db.query(Room).filter(Room.is_active == True)

    if theme and theme != "all":
        query = query.filter(Room.theme == theme)

    if language and language != "all":
        query = query.filter(Room.language == language)

    total = query.count()
    rooms = query.offset(skip).limit(limit).all()

    return RoomList(rooms=rooms, total=total)


@router.get("/active", response_model=ActiveRoomLookupResponse)
async def get_active_room_by_channel(
    channel: str = Query(..., min_length=1, description="Twitch login or channel id"),
    db: Session = Depends(get_db),
):
    """Public lookup: active GuessIO room for a Twitch channel (extension auto-join)."""
    room = find_active_room_by_channel(db, channel)
    if not room:
        return ActiveRoomLookupResponse(active=False, room=None)
    return ActiveRoomLookupResponse(active=True, room=room)


@router.delete("/active/me")
async def deactivate_my_active_room(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deactivate the streamer's current active room (e.g. when leaving the game)."""
    deactivate_other_rooms_for_streamer(db, current_user)
    db.commit()
    return {"message": "Active room deactivated"}


@router.get("/{room_id}", response_model=RoomResponse)
async def get_room(room_id: int, db: Session = Depends(get_db)):
    """Get a specific room by ID"""
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


@router.post("/", response_model=RoomResponse)
async def create_room(
    room: RoomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new room and register it as the streamer's active Twitch room."""
    existing_room = db.query(Room).filter(Room.name == room.name).first()
    if existing_room:
        if existing_room.created_by != current_user.id:
            raise HTTPException(status_code=400, detail="Room name already exists")
        deactivate_other_rooms_for_streamer(
            db, current_user, exclude_room_id=existing_room.id
        )
        existing_room.theme = room.theme
        existing_room.language = room.language
        existing_room.is_active = True
        existing_room.twitch_channel = (
            current_user.username.lower() if current_user.username else None
        )
        existing_room.twitch_channel_id = (
            str(current_user.twitch_id) if current_user.twitch_id else None
        )
        db.commit()
        db.refresh(existing_room)
        return existing_room

    deactivate_other_rooms_for_streamer(db, current_user)

    db_room = Room(
        name=room.name,
        theme=room.theme,
        language=room.language,
        created_by=current_user.id,
        is_active=True,
        twitch_channel=current_user.username.lower() if current_user.username else None,
        twitch_channel_id=str(current_user.twitch_id) if current_user.twitch_id else None,
    )

    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    return db_room


@router.put("/{room_id}", response_model=RoomResponse)
async def update_room(
    room_id: int,
    room_update: RoomUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a room (only by creator)"""
    db_room = db.query(Room).filter(Room.id == room_id).first()
    if not db_room:
        raise HTTPException(status_code=404, detail="Room not found")

    if db_room.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this room")

    update_data = room_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_room, field, value)

    db.commit()
    db.refresh(db_room)
    return db_room


@router.delete("/{room_id}")
async def delete_room(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a room (only by creator)"""
    db_room = db.query(Room).filter(Room.id == room_id).first()
    if not db_room:
        raise HTTPException(status_code=404, detail="Room not found")

    if db_room.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this room")

    db_room.is_active = False
    db.commit()

    return {"message": "Room deleted successfully"}
