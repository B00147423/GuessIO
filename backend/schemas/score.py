from pydantic import BaseModel

class ScoreCreate(BaseModel):
    user_id: int
    score: int

class ScoreResponse(ScoreCreate):
    id: int
    class Config:
        from_attributes = True
