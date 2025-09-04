from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from models.word import Word
from schemas.word import WordResponse, WordList
import random

router = APIRouter(prefix="/words", tags=["words"])

@router.get("/random", response_model=WordResponse)
def random_word(db: Session = Depends(get_db)):
    """Get a random word from any theme"""
    words = db.query(Word).all()
    if not words:
        raise HTTPException(404, "No words available")
    return random.choice(words)

@router.get("/theme/{theme}", response_model=WordResponse)
def random_word_by_theme(theme: str, db: Session = Depends(get_db)):
    """Get a random word from a specific theme"""
    if theme == "random":
        # For random theme, get any word
        words = db.query(Word).all()
    else:
        # For specific theme, filter by theme
        words = db.query(Word).filter(Word.theme == theme).all()
    
    if not words:
        raise HTTPException(404, f"No words available for theme: {theme}")
    
    return random.choice(words)

@router.get("/theme/{theme}/list", response_model=WordList)
def get_words_by_theme(theme: str, db: Session = Depends(get_db)):
    """Get all words from a specific theme"""
    if theme == "random":
        # For random theme, get all words
        words = db.query(Word).all()
    else:
        # For specific theme, filter by theme
        words = db.query(Word).filter(Word.theme == theme).all()
    
    return WordList(words=words, total=len(words))
