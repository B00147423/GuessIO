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
    ],
    'technology': [
        'laptop', 'phone', 'tablet', 'watch', 'camera', 'speaker',
        'keyboard', 'mouse', 'monitor', 'printer', 'scanner', 'router',
        'headphones', 'microphone', 'webcam', 'charger', 'battery', 'cable',
        'wifi', 'bluetooth', 'usb', 'hdmi', 'ethernet', 'cloud', 'app'
    ],
    'brands': [
        'nike', 'adidas', 'apple', 'google', 'microsoft', 'amazon',
        'facebook', 'instagram', 'twitter', 'youtube', 'netflix', 'spotify',
        'tesla', 'bmw', 'mercedes', 'toyota', 'honda', 'ford', 'samsung'
    ],
    'objects': [
        'chair', 'table', 'lamp', 'clock', 'mirror', 'picture', 'frame',
        'book', 'pen', 'pencil', 'paper', 'notebook', 'folder', 'stapler',
        'scissors', 'tape', 'glue', 'ruler', 'calculator', 'calendar'
    ],
    'nature': [
        'tree', 'flower', 'grass', 'leaf', 'mountain', 'river', 'ocean',
        'sun', 'moon', 'star', 'cloud', 'rain', 'snow', 'fire', 'water',
        'rock', 'sand', 'forest', 'beach', 'desert', 'valley', 'hill'
    ],
    'body': [
        'head', 'eye', 'nose', 'mouth', 'ear', 'hand', 'finger', 'arm',
        'leg', 'foot', 'toe', 'hair', 'face', 'smile', 'teeth', 'tongue',
        'chest', 'back', 'shoulder', 'elbow', 'knee', 'ankle'
    ],
    'clothes': [
        'shirt', 'pants', 'dress', 'shoes', 'hat', 'jacket', 'coat',
        'socks', 'underwear', 'gloves', 'scarf', 'belt', 'tie', 'suit',
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
        'worried', 'proud', 'shy', 'brave', 'calm', 'nervous'
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
