# CSS Organization Structure

This folder contains all the CSS files organized by component for better maintainability.

## 📁 File Structure

```
frontend/src/css/
├── README.md           # This file
├── base.css           # Global styles, resets, common utilities
├── header.css         # Header component styles (logo, live indicator)
├── index.css          # Index page styles (hero, preview, leaderboard)
├── mainMenu.css       # Main menu styles (user info, menu buttons)
├── game.css           # Game page styles (canvas, tools, game UI)
└── themeSelection.css # Theme selection popup styles
```

## 🎯 Component Breakdown

### **base.css**
- Global resets and base styles
- Common button styles (`.btn`, `.btn-primary`, etc.)
- Container and responsive utilities
- Common animations and transitions

### **header.css**
- Header layout and positioning
- Logo styling and animations
- Live indicator with pulsing dot
- Responsive header behavior

### **index.css**
- Main card and hero section
- Game preview canvas and tools
- Leaderboard styling
- Row layout and responsive design

### **mainMenu.css**
- User info display
- Main menu card styling
- Menu button layouts
- Room input styling

### **game.css**
- Game container and layout
- Canvas styling and tools
- Color picker and game info
- Responsive game design

### **themeSelection.css**
- Theme popup overlay
- Theme grid layout
- Theme option hover effects
- Responsive theme selection

## 🔧 How to Use

The main `style.css` file imports all these component files using `@import` statements. This means:

1. **All styles are still loaded** - no functionality is lost
2. **Easier to find specific styles** - look in the right component file
3. **Better organization** - related styles are grouped together
4. **Easier maintenance** - edit specific components without affecting others

## 📱 Responsive Design

Each component file includes its own responsive styles, making it easy to:
- Find mobile-specific styles for each component
- Modify responsive behavior without affecting other components
- Maintain consistent breakpoints across components

## 🚀 Benefits

- **Faster development** - find styles quickly
- **Better collaboration** - multiple developers can work on different components
- **Easier debugging** - isolate style issues to specific components
- **Cleaner code** - no more scrolling through thousands of lines
- **Modular approach** - add/remove components easily
