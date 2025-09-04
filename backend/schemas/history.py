from pydantic import BaseModel

class HistoryBase(BaseModel):
    user_id: int
    word_id: int
    correct: bool

class HistoryCreate(HistoryBase):
    pass

class HistoryResponse(HistoryBase):
    id: int
    class Config:
        orm_mode = True
