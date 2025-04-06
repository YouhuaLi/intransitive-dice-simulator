# CLAUDE.md - Intransitive Dice Demo

## Project Structure
- `/public/index.html` - Main HTML file
- `/public/styles.css` - CSS styling
- `/public/app.js` - JavaScript application logic

## Serving the Application
To serve the application locally:
```
cd /Users/youhua.li/code/claude_test
python3 -m http.server
```
Then visit http://localhost:8000/public/

## Available Dice Sets
The application includes several intransitive dice sets:

### 1. Classic Set
- Die A: [3, 3, 3, 3, 3, 6]
- Die B: [2, 2, 2, 5, 5, 5]
- Die C: [1, 4, 4, 4, 4, 4]

### 2. Efron's Dice
- Die A: [4, 4, 4, 4, 0, 0]
- Die B: [3, 3, 3, 3, 3, 3]
- Die C: [6, 6, 2, 2, 2, 2]
- Die D: [5, 5, 5, 1, 1, 1]

### 3. Grime Dice
- Die A: [5, 5, 9, 1, 1, 1]
- Die B: [6, 6, 6, 2, 2, 2]
- Die C: [7, 7, 3, 3, 3, 3]
- Die D: [8, 4, 4, 4, 4, 4]

### 4. Oskar Dice
- Die A: [1, 2, 5, 6, 7, 9]
- Die B: [1, 3, 4, 5, 8, 9]
- Die C: [2, 3, 4, 7, 8, 9]
- Die D: [1, 2, 6, 7, 8, 9]
- Die E: [3, 4, 5, 6, 7, 8]

### 5. Miwin's Dice
- Die A: [1, 5, 9, 10, 11, 12]
- Die B: [4, 6, 7, 8, 11, 12]
- Die C: [2, 3, 7, 8, 9, 12]

## Code Style
- Use ES6 syntax
- Use camelCase for variables and functions
- Use descriptive variable names
- Group related code together
- Include comments for complex logic
- Format with 4-space indentation

## Application Structure
- Sidebar - For selecting different dice sets
- Main content area - Shows the dice set and results
- Dice container - Shows all dice in the current set
- Controls - Buttons for roll, reset, and simulation
- Results - Shows win counts and percentages between dice