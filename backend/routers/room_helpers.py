"""Shared helpers for Twitch channel ↔ active room lookup."""
from sqlalchemy import func
from sqlalchemy.orm import Session

from models.room import Room
from models.user import User


def normalize_channel_param(channel: str) -> str:
    return (channel or "").strip().lower().lstrip("#")


def deactivate_other_rooms_for_streamer(
    db: Session,
    user: User,
    *,
    exclude_room_id: int | None = None,
) -> None:
    if not user.twitch_id and not user.username:
        return

    query = db.query(Room).filter(Room.is_active.is_(True))
    filters = []
    if user.twitch_id:
        filters.append(Room.twitch_channel_id == str(user.twitch_id))
    if user.username:
        filters.append(func.lower(Room.twitch_channel) == user.username.lower())

    if not filters:
        return

    from sqlalchemy import or_

    query = query.filter(or_(*filters))
    if exclude_room_id is not None:
        query = query.filter(Room.id != exclude_room_id)

    for room in query.all():
        room.is_active = False


def find_active_room_by_channel(db: Session, channel: str) -> Room | None:
    normalized = normalize_channel_param(channel)
    if not normalized:
        return None

    query = db.query(Room).filter(Room.is_active.is_(True))

    if normalized.isdigit():
        return (
            query.filter(Room.twitch_channel_id == normalized)
            .order_by(Room.created_at.desc())
            .first()
        )

    return (
        query.filter(func.lower(Room.twitch_channel) == normalized)
        .order_by(Room.created_at.desc())
        .first()
    )
