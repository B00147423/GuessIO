# seed_words.py - Proper word seeding with themes
import sqlite3
import os

# Database path
db_path = "game.db"

# Check if database exists, if not create it
if not os.path.exists(db_path):
    print("❌ Database not found. Please run your backend first to create it.")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# First, add theme column to existing words table if it doesn't exist
try:
    cursor.execute("ALTER TABLE words ADD COLUMN theme TEXT DEFAULT 'random'")
    print("✅ Added theme column to words table")
except sqlite3.OperationalError:
    print("ℹ️  Theme column already exists")

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
        'guitar', 'piano', 'drums', 'violin', 'trumpet', 'saxophone',
        'microphone', 'headphones', 'concert', 'band', 'singer', 'rapper',
        'rock', 'jazz', 'classical', 'pop', 'hip hop', 'country'
    ]
}

def seed_words():
    print("🌱 Seeding words with themes...")
    
    # Clear existing words
    cursor.execute("DELETE FROM words")
    print("🗑️  Cleared existing words")
    
    # Insert themed words
    total_words = 0
    for theme, words in themed_words.items():
        for word in words:
            try:
                cursor.execute(
                    "INSERT INTO words (word, theme) VALUES (?, ?)",
                    (word, theme)
                )
                total_words += 1
            except sqlite3.IntegrityError:
                print(f"⚠️  Word '{word}' already exists, skipping")
    
    # Commit changes
    conn.commit()
    print(f"✅ Successfully seeded {total_words} words with themes!")
    
    # Show summary
    cursor.execute("SELECT theme, COUNT(*) FROM words GROUP BY theme")
    theme_counts = cursor.fetchall()
    
    print("\n📊 Theme Summary:")
    for theme, count in theme_counts:
        print(f"   {theme.capitalize()}: {count} words")

if __name__ == "__main__":
    try:
        seed_words()
        print("\n🎉 Word seeding completed successfully!")
    except Exception as e:
        print(f"❌ Error seeding words: {e}")
    finally:
        conn.close()
