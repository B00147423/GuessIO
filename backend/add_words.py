#!/usr/bin/env python3
"""
Script to add words to the database from any source
Usage: python add_words.py
"""

import requests
import json

# Backend API endpoint
API_BASE = "http://localhost:8000"

def add_word(word, theme):
    """Add a single word to the database"""
    try:
        # You would need to create an endpoint for this, or use direct database access
        print(f"Would add: {word} (theme: {theme})")
        return True
    except Exception as e:
        print(f"Error adding {word}: {e}")
        return False

def add_words_from_list(words, theme):
    """Add multiple words from a list"""
    print(f"Adding {len(words)} words to theme '{theme}'...")
    for word in words:
        add_word(word, theme)

# Example: Add words from Google Fonts
google_fonts_words = [
    "arial", "helvetica", "times", "courier", "verdana", "georgia", 
    "palatino", "garamond", "bookman", "avant", "lucida", "trebuchet",
    "comic", "impact", "tahoma", "geneva", "optima", "futura"
]

# Example: Add words from popular brands
brand_words = [
    "nike", "adidas", "apple", "google", "microsoft", "amazon", 
    "facebook", "instagram", "twitter", "youtube", "netflix", "spotify",
    "tesla", "bmw", "mercedes", "toyota", "honda", "ford"
]

# Example: Add words from common objects
object_words = [
    "laptop", "phone", "tablet", "watch", "camera", "speaker", 
    "keyboard", "mouse", "monitor", "printer", "scanner", "router",
    "headphones", "microphone", "webcam", "charger", "battery", "cable"
]

if __name__ == "__main__":
    print("Word Addition Script")
    print("===================")
    
    # Add words from different sources
    add_words_from_list(google_fonts_words, "technology")
    add_words_from_list(brand_words, "brands") 
    add_words_from_list(object_words, "objects")
    
    print("Done!")
