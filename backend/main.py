from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

# Import DB
from db import engine, Base

#  force import your models so SQLAlchemy registers them
from models import user, score, word, history

# Import routers

from routers import users, words, scores, rooms
from api import auth
from api import api as api_router
# Create tables if not exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Guessio Backend")

# Add CORS middleware
allowed_origins = os.environ.get("ALLOWED_ORIGINS", "").split(",")
allowed_origins = [origin.strip() for origin in allowed_origins if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount frontend (optional, just for testing local frontend)
frontend_path = os.path.join(os.path.dirname(__file__), "../frontend")
app.mount("/static", StaticFiles(directory=frontend_path), name="static")

@app.get("/")
async def serve_index():
    return FileResponse(os.path.join(frontend_path, "index.html"))

# Attach DB routers
app.include_router(users.router)
app.include_router(words.router)
app.include_router(scores.router)
app.include_router(rooms.router)
app.include_router(auth.router)
app.include_router(api_router.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
