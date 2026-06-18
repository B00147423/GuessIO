"""Twitch Helix helpers — check if a channel is live."""
import os
import time
import threading

import requests
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/twitch", tags=["twitch"])

CLIENT_ID = os.environ["TWITCH_CLIENT_ID"]
CLIENT_SECRET = os.environ["TWITCH_CLIENT_SECRET"]

_token_lock = threading.Lock()
_app_token: str | None = None
_token_expires_at: float = 0


def _get_app_access_token() -> str:
    global _app_token, _token_expires_at

    with _token_lock:
        if _app_token and time.time() < _token_expires_at - 60:
            return _app_token

    resp = requests.post(
        "https://id.twitch.tv/oauth2/token",
        params={
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "grant_type": "client_credentials",
        },
        timeout=10,
    )
    data = resp.json()
    if "access_token" not in data:
        raise HTTPException(status_code=502, detail="Failed to get Twitch app token")

    with _token_lock:
        _app_token = data["access_token"]
        _token_expires_at = time.time() + int(data.get("expires_in", 3600))

    return _app_token


def _helix_headers() -> dict[str, str]:
    return {
        "Client-Id": CLIENT_ID,
        "Authorization": f"Bearer {_get_app_access_token()}",
    }


@router.get("/stream-status")
def get_stream_status(
    login: str = Query(..., min_length=1, description="Twitch channel login, e.g. ninja"),
):
    """
    Is this Twitch channel live right now?
    Pass the streamer's Twitch username (same as state.user.username after login).
    """
    channel = login.strip().lower().lstrip("#")
    if not channel:
        raise HTTPException(status_code=400, detail="login is required")

    try:
        resp = requests.get(
            "https://api.twitch.tv/helix/streams",
            headers=_helix_headers(),
            params={"user_login": channel},
            timeout=10,
        )
        resp.raise_for_status()
        streams = resp.json().get("data", [])
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Twitch API error: {exc}") from exc

    if not streams:
        return {"live": False, "login": channel}

    stream = streams[0]
    return {
        "live": True,
        "login": channel,
        "title": stream.get("title"),
        "viewer_count": stream.get("viewer_count", 0),
        "game_name": stream.get("game_name"),
    }
