from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db import get_db
from models.user import User
import asyncio
import json
import websockets
from fastapi import FastAPI
app = FastAPI()

router = APIRouter()

@router.post("/spawn_bot/{user_id}")
async def spawn_bot(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"status": "error", "message": "User not found"}
    if not user.oauth_token:
        return {"status": "error", "message": "No OAuth token stored for this user"}

    try:
        uri = "ws://localhost:9001"
        async with websockets.connect(uri) as ws:
            # Build spawn message for your C++ server
            msg = {
                "type": "spawn_bot",
                "oauth": f"oauth:{user.oauth_token}",
                "nick": user.username,
                "channel": f"#{user.username.lower()}"
            }
            await ws.send(json.dumps(msg))

            # Optionally wait for response from C++ server
            response = await ws.recv()
            return json.loads(response) 
        
        if "alreayd exists" in res.get("message", "").lower():
             return {"status": "ok", "message": "Bot already running"}

    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/stop_bot/{user_id}")
async def stop_bot(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"status": "error", "message": "User not found"}

    try:
        uri = "ws://localhost:9001"
        async with websockets.connect(uri) as ws:
            msg = {
                "type": "stop_bot",
                "channel": f"#{user.username.lower()}"
            }
            await ws.send(json.dumps(msg))

            # Optionally wait for C++ server response
            response = await ws.recv()
            return json.loads(response)

    except Exception as e:
        return {"status": "error", "message": str(e)}
