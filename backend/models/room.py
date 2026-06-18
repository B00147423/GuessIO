from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db import Base

class Room(Base):
    __tablename__ = "rooms"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    theme = Column(String)  # anime, food, animals, gaming, movies, music
    language = Column(String, default="EN")
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # Streamer Twitch identity — used by extension auto-join (login + numeric channel id)
    twitch_channel = Column(String, index=True, nullable=True)
    twitch_channel_id = Column(String, index=True, nullable=True)
    
    # Relationship to user who created the room
    creator = relationship("User", back_populates="rooms")
