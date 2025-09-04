from pydantic import BaseModel
from typing import List

class WordResponse(BaseModel):
    id: int
    word: str
    theme: str
    
    class Config:
        from_attributes = True

class WordList(BaseModel):
    words: List[WordResponse]
    total: int
