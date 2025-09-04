import requests

BASE = "http://127.0.0.1:8000"   # use 127.0.0.1 instead of localhost

def show(label, resp):
    print(f"\n--- {label} ---")
    print("Status:", resp.status_code)
    print("Raw response:", resp.text)

def main():
    print("Starting test...")

    try:
        user = {
            "twitch_id": "abc123",
            "username": "TestViewer",
            "profile_image": None
        }
        resp = requests.post(f"{BASE}/users/", json=user, timeout=5)
        show("Join", resp)
    except Exception as e:
        print("Join request failed:", e)

    try:
        resp = requests.get(f"{BASE}/words/random", timeout=5)
        show("Random word", resp)
    except Exception as e:
        print("Random word request failed:", e)

    try:
        score = {"user_id": 1, "score": 50}
        resp = requests.post(f"{BASE}/scores/", json=score, timeout=5)
        show("Save score", resp)
    except Exception as e:
        print("Save score request failed:", e)

    try:
        resp = requests.get(f"{BASE}/scores/leaderboard", timeout=5)
        show("Leaderboard", resp)
    except Exception as e:
        print("Leaderboard request failed:", e)

if __name__ == "__main__":
    main()
