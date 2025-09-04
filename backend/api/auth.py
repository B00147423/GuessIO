from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import RedirectResponse, JSONResponse
import requests
from db import get_db
from sqlalchemy.orm import Session
from schemas.user import UserCreate
from models.user import User
import os
import time
import threading

router = APIRouter(prefix="/auth", tags=["auth"])

CLIENT_ID = os.environ["TWITCH_CLIENT_ID"]
CLIENT_SECRET = os.environ["TWITCH_CLIENT_SECRET"]
FRONTEND_URL = os.environ["FRONTEND_URL"]

# ✅ Backend handles the callback
REDIRECT_URI = os.environ["REDIRECT_URI"]

# -------------------
# Simple in-memory cache
# -------------------
_user_cache_lock = threading.Lock()
_user_cache_by_twitch_id = {}
_user_cache_by_id = {}

def get_user_by_twitch_id(twitch_id: str, db: Session):
    with _user_cache_lock:
        if twitch_id in _user_cache_by_twitch_id:
            return _user_cache_by_twitch_id[twitch_id]

    user = db.query(User).filter(User.twitch_id == twitch_id).first()
    if user:
        with _user_cache_lock:
            _user_cache_by_twitch_id[twitch_id] = user
            _user_cache_by_id[user.id] = user
    return user

def get_user_by_id(user_id: int, db: Session):
    with _user_cache_lock:
        if user_id in _user_cache_by_id:
            return _user_cache_by_id[user_id]

    user = db.query(User).filter(User.id == user_id).first()
    if user:
        with _user_cache_lock:
            _user_cache_by_id[user_id] = user
            _user_cache_by_twitch_id[user.twitch_id] = user
    return user

def clear_user_cache(user=None):
    """Remove a single user or all users from cache."""
    with _user_cache_lock:
        if user:
            _user_cache_by_id.pop(user.id, None)
            _user_cache_by_twitch_id.pop(user.twitch_id, None)
        else:
            _user_cache_by_id.clear()
            _user_cache_by_twitch_id.clear()


@router.get("/login_url")
def get_login_url():
    url = (
        "https://id.twitch.tv/oauth2/authorize"
        f"?client_id={CLIENT_ID}"
        f"&redirect_uri={REDIRECT_URI}"
        "&response_type=code"
        "&scope=chat:read+chat:edit+user:read:email"
    )
    return {"url": url}


@router.get("/callback")
def auth_callback(code: str, db: Session = Depends(get_db)):
    start_time = time.time()
    
    # 1. Exchange code for token
    try:
        token_resp = requests.post(
            "https://id.twitch.tv/oauth2/token",
            params={
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": REDIRECT_URI,
            },
            timeout=10
        )
        token_data = token_resp.json()
    except requests.exceptions.Timeout:
        return JSONResponse(
            {"status": "error", "message": "Twitch API timeout"},
            status_code=408
        )
    except Exception as e:
        return JSONResponse(
            {"status": "error", "message": f"Token exchange failed: {str(e)}"},
            status_code=500
        )

    if "error" in token_data or "access_token" not in token_data:
        return JSONResponse(
            {"status": "error", "message": token_data.get("message", "Token exchange failed")},
            status_code=400
        )

    access_token = token_data["access_token"]

    # 2. Get user info
    try:
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Client-Id": CLIENT_ID,
        }
        user_resp = requests.get(
            "https://api.twitch.tv/helix/users", 
            headers=headers, 
            timeout=10
        ).json()
        data = user_resp["data"][0]
    except requests.exceptions.Timeout:
        return JSONResponse(
            {"status": "error", "message": "Twitch API timeout"},
            status_code=408
        )
    except Exception as e:
        return JSONResponse(
            {"status": "error", "message": f"Failed to get user info: {str(e)}"},
            status_code=500
        )

    # 3. Upsert user in DB
    try:
        user_in = UserCreate(
            twitch_id=data["id"],
            username=data["login"],
            profile_image=data["profile_image_url"]
        )
        
        existing = get_user_by_twitch_id(data["id"], db)
        
        if existing:
            existing.username = user_in.username
            existing.profile_image = user_in.profile_image
            existing.oauth_token = access_token
            db.commit()
            user = existing
        else:
            user = User(**user_in.dict())
            user.oauth_token = access_token
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # Clear + repopulate cache for this user
        clear_user_cache(user)
        with _user_cache_lock:
            _user_cache_by_id[user.id] = user
            _user_cache_by_twitch_id[user.twitch_id] = user

    except Exception as e:
        db.rollback()
        return JSONResponse(
            {"status": "error", "message": f"Database error: {str(e)}"},
            status_code=500
        )

    # 4. Set cookie and redirect
    response = RedirectResponse(url=FRONTEND_URL)
    response.set_cookie(
        key="session_user",
        value=str(user.id),
        httponly=True,
        secure=False,   # set True in production
        samesite="lax"
    )
    
    print(f"✅ Login completed in {time.time() - start_time:.2f}s")
    return response


@router.get("/me")
def get_me(request: Request, db: Session = Depends(get_db)):
    user_id = request.cookies.get("session_user")
    if not user_id:
        return {"status": "error", "message": "Not logged in"}

    try:
        user = get_user_by_id(int(user_id), db)
        if not user:
            return {"status": "error", "message": "User not found"}

        return {
            "status": "ok",
            "user": {
                "id": user.id,
                "twitch_id": user.twitch_id,
                "username": user.username,
                "profile_image": user.profile_image
            }
        }
    except ValueError:
        return {"status": "error", "message": "Invalid user ID"}


@router.post("/logout")
def logout():
    response = JSONResponse({"status": "ok", "message": "Logged out"})
    response.delete_cookie("session_user")
    clear_user_cache()
    return response


# Dependency to fetch current user
def get_current_user(request: Request, db: Session = Depends(get_db)):
    user_id = request.cookies.get("session_user")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        user = get_user_by_id(int(user_id), db)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID")
