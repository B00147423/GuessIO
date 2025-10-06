from locust import User, task, between, events
import websocket, json, random, time

ROOM_COUNT = 50  # number of rooms to simulate

def fire_event(name, start, size=0, exc=None):
    """Helper to record Locust metrics"""
    events.request.fire(
        request_type="websocket",
        name=name,
        response_time=(time.time() - start) * 1000,
        response_length=size,
        exception=exc,
    )

class GuessIOUser(User):
    wait_time = between(0.5, 2.0)

    def on_start(self):
        """Connect and join a random room"""
        self.ws = websocket.WebSocket()
        start = time.time()
        try:
            self.ws.connect("ws://localhost:9001")
            fire_event("connect", start)
        except Exception as e:
            fire_event("connect", start, exc=e)
            return

        self.username = f"user_{random.randint(1, 99999)}"
        self.room = f"room_{(self.environment.runner.user_count % ROOM_COUNT) + 1}"


        # join the room
        payload = {
            "type": "join",
            "room": self.room,
            "payload": {"username": self.username}
        }
        start = time.time()
        try:
            self.ws.send(json.dumps(payload))
            fire_event("join_room", start)
        except Exception as e:
            fire_event("join_room", start, exc=e)

    @task(3)
    def send_chat(self):
        """Send chat messages"""
        payload = {
            "type": "chat",
            "room": self.room,
            "payload": random.choice(["hi!", "good guess", "lol", "try apple"])
        }
        start = time.time()
        try:
            self.ws.send(json.dumps(payload))
            fire_event("chat_message", start)
        except Exception as e:
            fire_event("chat_message", start, exc=e)

    @task(1)
    def send_guess(self):
        """Simulate guessing words"""
        word = random.choice(["apple", "banana", "car", "dog", "cat"])
        payload = {
            "type": "guess",
            "room": self.room,
            "payload": {"guess": word}
        }
        start = time.time()
        try:
            self.ws.send(json.dumps(payload))
            fire_event("guess", start)
        except Exception as e:
            fire_event("guess", start, exc=e)

    @task(1)
    def send_draw(self):
        """Simulate drawing (optional)"""
        draw = {"x": random.randint(0, 800), "y": random.randint(0, 600)}
        payload = {
            "type": "draw",
            "room": self.room,
            "payload": draw
        }
        start = time.time()
        try:
            self.ws.send(json.dumps(payload))
            fire_event("draw", start)
        except Exception as e:
            fire_event("draw", start, exc=e)

    def on_stop(self):
        """Gracefully leave"""
        try:
            payload = {
                "type": "leave",
                "room": self.room,
                "payload": {"username": self.username}
            }
            self.ws.send(json.dumps(payload))
            self.ws.close()
        except:
            pass
