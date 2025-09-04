from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db import get_db
from models.score import Score
from models.user import User
from schemas.score import ScoreCreate, ScoreResponse

router = APIRouter(prefix="/scores", tags=["scores"])

@router.post("/", response_model=ScoreResponse)
def save_score(score: ScoreCreate, db: Session = Depends(get_db)):
    new_score = Score(user_id=score.user_id, score=score.score)
    db.add(new_score)
    db.commit()
    db.refresh(new_score)
    return new_score

@router.get("/leaderboard")
def leaderboard(limit: int = 10, db: Session = Depends(get_db)):
    results = (
        db.query(User.username, User.profile_image, Score.score)
        .join(Score, User.id == Score.user_id)
        .order_by(Score.score.desc())
        .limit(limit)
        .all()
    )
    return [
        {"username": row.username, "profile_image": row.profile_image, "score": row.score}
        for row in results
    ]
