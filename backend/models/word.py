from sqlalchemy import Column, Integer, String
from db import Base

class Word(Base):
    __tablename__ = "words"

    id = Column(Integer, primary_key=True, index=True)
    word = Column(String, unique=True, index=True, nullable=False)
    theme = Column(String, nullable=False, default="random")  # anime, food, animals, gaming, movies, music, random
