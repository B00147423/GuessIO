from sqlalchemy import Column, Integer, Boolean, ForeignKey, DateTime, func
from db import Base

class History(Base):
    __tablename__ = "history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    word_id = Column(Integer, ForeignKey("words.id"))
    correct = Column(Boolean)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
