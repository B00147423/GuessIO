from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db import get_db
from models.user import User
import os
import json
import websockets

router = APIRouter()

GAME_SERVER_WS_URL = os.getenv("GAME_SERVER_WS_URL", "ws://localhost:9001")


@router.post("/spawn_bot/{user_id}")
async def spawn_bot(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"status": "error", "message": "User not found"}
    if not user.oauth_token:
        return {"status": "error", "message": "No OAuth token stored for this user"}

    try:
        async with websockets.connect(GAME_SERVER_WS_URL) as ws:
            msg = {
                "type": "spawn_bot",
                "oauth": f"oauth:{user.oauth_token}",
                "nick": user.username,
                "channel": f"#{user.username.lower()}"
            }
            await ws.send(json.dumps(msg))

            response = await ws.recv()
            return json.loads(response)

    except Exception as e:
        return {"status": "ok", "message": f"Bot spawn requested (game server unavailable: {e})"}


@router.post("/stop_bot/{user_id}")
async def stop_bot(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"status": "error", "message": "User not found"}
#stop bot
    try:
        async with websockets.connect(GAME_SERVER_WS_URL) as ws:
            msg = {
                "type": "stop_bot",
                "channel": f"#{user.username.lower()}"
            }
            await ws.send(json.dumps(msg))

            response = await ws.recv()
            return json.loads(response)

    except Exception as e:
        return {"status": "ok", "message": f"Bot stop requested (game server unavailable: {e})"}
