# Intransitive Dice Demonstration

This web application demonstrates the counterintuitive concept of intransitive dice. Unlike traditional dice comparisons where if die A beats die B and die B beats die C, then die A should beat die C (transitivity), intransitive dice break this pattern.

## What are Intransitive Dice?

Intransitive dice are sets of dice where:
- Die A tends to beat Die B (wins more often when both are rolled)
- Die B tends to beat Die C
- Die C tends to beat Die A

This creates a rock-paper-scissors-like cycle, which can be surprising and counterintuitive.

## Available Dice Sets

The application now includes multiple sets of intransitive dice that you can explore:

### 1. Classic Set
- **Die A**: [3, 3, 3, 3, 3, 6]
- **Die B**: [2, 2, 2, 5, 5, 5]
- **Die C**: [1, 4, 4, 4, 4, 4]
- Each die beats the next with a 5/9 (56%) probability

### 2. Efron's Dice
Created by mathematician Bradley Efron:
- **Die A**: [4, 4, 4, 4, 0, 0]
- **Die B**: [3, 3, 3, 3, 3, 3]
- **Die C**: [6, 6, 2, 2, 2, 2]
- **Die D**: [5, 5, 5, 1, 1, 1]
- Each die beats the next with a 2/3 (67%) probability

### 3. Grime Dice
Created by mathematician James Grime:
- **Die A**: [5, 5, 9, 1, 1, 1]
- **Die B**: [6, 6, 6, 2, 2, 2]
- **Die C**: [7, 7, 3, 3, 3, 3]
- **Die D**: [8, 4, 4, 4, 4, 4]
- Has both intransitivity and non-transitive sub-loops

### 4. Oskar Dice
A complex set with five dice:
- **Die A**: [1, 2, 5, 6, 7, 9]
- **Die B**: [1, 3, 4, 5, 8, 9]
- **Die C**: [2, 3, 4, 7, 8, 9]
- **Die D**: [1, 2, 6, 7, 8, 9]
- **Die E**: [3, 4, 5, 6, 7, 8]
- Creates a pentagram pattern of winning relationships

### 5. Miwin's Dice
A set with perfect symmetry:
- **Die A**: [1, 5, 9, 10, 11, 12]
- **Die B**: [4, 6, 7, 8, 11, 12]
- **Die C**: [2, 3, 7, 8, 9, 12]
- Each die beats the next with exactly 17/36 (47%) probability

## Features

- Interactive sidebar to select different intransitive dice sets
- Roll all dice with a single click
- View the running totals of wins for each pair of dice
- Simulate 1000 rolls to see the long-term probability distributions
- Reset all counts to start over
- Detailed information about each dice set
- Responsive design works on all devices

## How to Use

1. Open `public/index.html` in a web browser
2. Select a dice set from the sidebar on the left
3. Click "Roll Dice" to roll all dice once
4. Click "Simulate 1000 Rolls" to quickly see the probabilistic advantage
5. Click "Reset" to clear all counts
6. Hover over the result rows to see the expected win probabilities

## Mathematical Explanation

Intransitive dice break our intuition about transitivity. If we assume that because A beats B and B beats C, then A should beat C, we would be wrong. These dice sets demonstrate that mathematical relationships can form cycles rather than linear hierarchies.

This is similar to the game of rock-paper-scissors, but using dice and probability rather than fixed rules. The fascinating aspect is that despite the random nature of dice rolls, the intransitive relationship emerges reliably over many rolls.

## Running a Local Server

If you have Python installed, you can run a simple server with:

```
# Python 3
python -m http.server

# Python 2
python -m SimpleHTTPServer
```

Then visit `http://localhost:8000/public/` in your browser.

[Live Version](https://youhuali.github.io/intransitive-dice-simulator/public/)
