# seed_words_postgres.py - Seed words with themes for PostgreSQL
from sqlalchemy.orm import Session
from sqlalchemy import func
from db import SessionLocal, engine, Base
from models.word import Word
import os

# Sample words organized by theme
themed_words = {
    'anime': [
        'naruto', 'goku', 'sailor moon', 'attack on titan', 'one piece', 'dragon ball',
        'pokemon', 'my hero academia', 'demon slayer', 'jujutsu kaisen', 'bleach',
        'death note', 'fullmetal alchemist', 'evangelion', 'ghost in the shell'
    ],
    'food': [
        'pizza', 'hamburger', 'sushi', 'pasta', 'taco', 'burrito', 'ramen',
        'curry', 'steak', 'chicken', 'fish', 'salad', 'sandwich', 'ice cream',
        'cake', 'bread', 'rice', 'noodles', 'soup', 'stew'
    ],
    'animals': [
        'cat', 'dog', 'elephant', 'lion', 'tiger', 'bear', 'wolf', 'fox',
        'deer', 'rabbit', 'squirrel', 'bird', 'eagle', 'owl', 'penguin',
        'dolphin', 'whale', 'shark', 'octopus', 'butterfly'
    ],
    'gaming': [
        'minecraft', 'fortnite', 'call of duty', 'gta', 'fifa', 'pokemon',
        'mario', 'sonic', 'zelda', 'halo', 'god of war', 'uncharted',
        'red dead redemption', 'skyrim', 'fallout', 'witcher'
    ],
    'movies': [
        'star wars', 'marvel', 'batman', 'superman', 'spiderman', 'avengers',
        'titanic', 'jaws', 'terminator', 'matrix', 'lord of the rings',
        'harry potter', 'jurassic park', 'back to the future', 'ghostbusters'
    ],
    'music': [
        'guitar', 'piano', 'drums', 'violin', 'trumpet', 'saxophone', 'flute',
        'cello', 'bass', 'microphone', 'speaker', 'headphones', 'radio',
        'concert', 'song', 'album', 'band', 'singer', 'musician', 'orchestra'
    ],
    'sports': [
        'football', 'basketball', 'soccer', 'baseball', 'tennis', 'golf',
        'swimming', 'running', 'cycling', 'volleyball', 'hockey', 'boxing',
        'wrestling', 'skiing', 'snowboarding', 'surfing', 'skating', 'diving'
    ],
    'nature': [
        'tree', 'flower', 'mountain', 'ocean', 'river', 'forest', 'beach',
        'sun', 'moon', 'star', 'cloud', 'rain', 'snow', 'wind', 'storm',
        'rainbow', 'sunset', 'sunrise', 'valley', 'canyon'
    ],
    'technology': [
        'computer', 'phone', 'tablet', 'laptop', 'keyboard', 'mouse', 'screen',
        'internet', 'website', 'app', 'software', 'hardware', 'robot', 'ai',
        'code', 'programming', 'game', 'console', 'vr', 'ar'
    ],
    'clothing': [
        'shirt', 'pants', 'dress', 'jacket', 'coat', 'hat', 'shoes', 'socks',
        'skirt', 'shorts', 'boots', 'sandals', 'sweater', 'hoodie'
    ],
    'transportation': [
        'car', 'bus', 'train', 'plane', 'boat', 'ship', 'bicycle', 'motorcycle',
        'truck', 'taxi', 'helicopter', 'rocket', 'submarine', 'scooter',
        'skateboard', 'rollerblades', 'wagon', 'sled', 'kayak', 'canoe'
    ],
    'buildings': [
        'house', 'building', 'school', 'hospital', 'church', 'store', 'restaurant',
        'hotel', 'bank', 'library', 'museum', 'theater', 'stadium', 'bridge',
        'tower', 'castle', 'barn', 'garage', 'apartment', 'office'
    ],
    'colors': [
        'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown',
        'black', 'white', 'gray', 'silver', 'gold', 'rainbow', 'turquoise',
        'maroon', 'navy', 'lime', 'magenta', 'cyan'
    ],
    'shapes': [
        'circle', 'square', 'triangle', 'rectangle', 'oval', 'diamond', 'heart',
        'star', 'cross', 'arrow', 'line', 'curve', 'spiral', 'zigzag',
        'pentagon', 'hexagon', 'octagon', 'cube', 'sphere', 'pyramid'
    ],
    'actions': [
        'run', 'walk', 'jump', 'swim', 'fly', 'dance', 'sing', 'play',
        'eat', 'drink', 'sleep', 'read', 'write', 'draw', 'paint', 'cook',
        'clean', 'wash', 'brush', 'cut', 'build', 'fix'
    ],
    'emotions': [
        'happy', 'sad', 'angry', 'excited', 'scared', 'surprised', 'confused',
        'tired', 'sleepy', 'hungry', 'thirsty', 'hot', 'cold', 'sick',
        'brave', 'calm', 'nervous'
    ]
}

def seed_words():
    """Seed words with themes into the database"""
    db: Session = SessionLocal()
    try:
        print("🌱 Seeding words with themes...")
        
        # Clear existing words
        db.query(Word).delete()
        db.commit()
        print("🗑️  Cleared existing words")
        
        # Insert themed words
        total_words = 0
        skipped_words = 0
        seen_words = set()  # Track words we've already added in this batch
        
        for theme, words_list in themed_words.items():
            for word_text in words_list:
                # Skip if we've already processed this word in this batch
                if word_text in seen_words:
                    skipped_words += 1
                    continue
                    
                # Check if word already exists in database
                existing = db.query(Word).filter(Word.word == word_text).first()
                if existing:
                    # Update theme if it's different
                    if existing.theme != theme:
                        existing.theme = theme
                        total_words += 1
                    else:
                        skipped_words += 1
                    seen_words.add(word_text)
                else:
                    try:
                        word = Word(word=word_text, theme=theme)
                        db.add(word)
                        total_words += 1
                        seen_words.add(word_text)
                    except Exception as e:
                        print(f"⚠️  Error adding word '{word_text}': {e}")
                        skipped_words += 1
                
                # Commit periodically to avoid large transactions
                if total_words % 50 == 0:
                    db.commit()
        
        # Final commit
        db.commit()
        if skipped_words > 0:
            print(f"✅ Successfully seeded {total_words} words with themes! ({skipped_words} skipped)")
        else:
            print(f"✅ Successfully seeded {total_words} words with themes!")
        
        # Show summary
        theme_counts = db.query(Word.theme, func.count(Word.id)).group_by(Word.theme).all()
        
        print("\n📊 Theme Summary:")
        for theme, count in theme_counts:
            print(f"   {theme.capitalize()}: {count} words")
            
    except Exception as e:
        print(f"❌ Error seeding words: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    try:
        seed_words()
        print("\n🎉 Word seeding completed successfully!")
    except Exception as e:
        print(f"❌ Error: {e}")
