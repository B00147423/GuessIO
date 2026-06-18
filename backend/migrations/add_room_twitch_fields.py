"""
Add twitch_channel / twitch_channel_id columns to rooms.
Run: python migrations/add_room_twitch_fields.py
"""

import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import inspect, text

from db import engine


def column_exists(inspector, table: str, column: str) -> bool:
    return any(col["name"] == column for col in inspector.get_columns(table))


def upgrade() -> None:
    inspector = inspect(engine)
    if "rooms" not in inspector.get_table_names():
        print("rooms table does not exist — run create_rooms_table.py first")
        return

    with engine.begin() as conn:
        if not column_exists(inspector, "rooms", "twitch_channel"):
            conn.execute(text("ALTER TABLE rooms ADD COLUMN twitch_channel VARCHAR"))
            print("Added rooms.twitch_channel")
        else:
            print("rooms.twitch_channel already exists")

        if not column_exists(inspector, "rooms", "twitch_channel_id"):
            conn.execute(text("ALTER TABLE rooms ADD COLUMN twitch_channel_id VARCHAR"))
            print("Added rooms.twitch_channel_id")
            try:
                conn.execute(
                    text(
                        "CREATE INDEX IF NOT EXISTS ix_rooms_twitch_channel "
                        "ON rooms (twitch_channel)"
                    )
                )
                conn.execute(
                    text(
                        "CREATE INDEX IF NOT EXISTS ix_rooms_twitch_channel_id "
                        "ON rooms (twitch_channel_id)"
                    )
                )
            except Exception as exc:
                print(f"Index creation skipped: {exc}")
        else:
            print("rooms.twitch_channel_id already exists")

    print("Migration complete.")


if __name__ == "__main__":
    upgrade()
