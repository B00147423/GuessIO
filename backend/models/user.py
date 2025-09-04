from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    twitch_id = Column(String, unique=True, index=True)
    username = Column(String, nullable=False)
    profile_image = Column(String, nullable=True)
    oauth_token = Column(String)
    
    # Relationship to rooms created by this user
    rooms = relationship("Room", back_populates="creator")
