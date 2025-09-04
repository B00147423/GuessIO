"""
Migration script to create rooms table
Run this after starting your backend to create the rooms table
"""

from sqlalchemy import create_engine, MetaData, Table, Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
import os

# Database connection - use the same setup as your main app
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import engine, Base
from models.room import Room

# Create tables using your existing Base
Base.metadata.create_all(bind=engine)

def create_rooms_table():
    """Create the rooms table if it doesn't exist"""
    
    # Tables are already created by Base.metadata.create_all above
    print("✅ Rooms table created successfully!")
    
    # Insert some sample rooms
    insert_sample_rooms()

def insert_sample_rooms():
    """Insert some sample rooms for testing"""
    
    sample_rooms = [
        {
            'name': 'anime_room',
            'theme': 'anime',
            'language': 'EN',
            'is_active': True,
            'created_by': 1  # Assuming user ID 1 exists
        },
        {
            'name': 'food_room',
            'theme': 'food',
            'language': 'EN',
            'is_active': True,
            'created_by': 1
        },
        {
            'name': 'gaming_room',
            'theme': 'gaming',
            'language': 'EN',
            'is_active': True,
            'created_by': 1
        }
    ]
    
    try:
        from sqlalchemy import text
        
        with engine.connect() as conn:
            for room in sample_rooms:
                # Check if room already exists
                result = conn.execute(
                    text("SELECT id FROM rooms WHERE name = :name"),
                    {"name": room['name']}
                ).fetchone()
                
                if not result:
                    conn.execute(
                        text("""INSERT INTO rooms (name, theme, language, is_active, created_by)
                           VALUES (:name, :theme, :language, :is_active, :created_by)"""),
                        room
                    )
                    print(f" Added sample room: {room['name']}")
                else:
                    print(f"⚠️  Room {room['name']} already exists")
            
            conn.commit()
            print("✅ Sample rooms inserted successfully!")
            
    except Exception as e:
        print(f"❌ Error inserting sample rooms: {e}")

if __name__ == "__main__":
    print("🚀 Creating rooms table...")
    create_rooms_table()
    print("🎉 Migration completed!")
