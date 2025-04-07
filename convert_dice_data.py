#!/usr/bin/env python3

import json
import string
import sys
import os
import numpy as np
from collections import defaultdict

def bias(d1, d2):
    """
    Calculate the bias between two dice by comparing face values.
    Positive means d1 beats d2, negative means d2 beats d1.
    """
    return sum([(j < i) - (i < j) for i in d1 for j in d2])

def wins(d1, d2):
    """Determine if d1 beats d2 based on bias sign"""
    return np.sign(bias(d1, d2))

def calculate_win_percentage(d1, d2):
    """Calculate the percentage of time d1 beats d2"""
    total_comparisons = len(d1) * len(d2)
    wins_count = sum([1 for i in d1 for j in d2 if i > j])
    return round((wins_count / total_comparisons) * 100, 1)

def calculate_relationships(dice_values, players=2):
    """
    Calculate beat relationships between dice based on bias calculations
    
    Args:
        dice_values (dict): Dictionary mapping die names to their face values
        players (int): Number of players for this dice set
    
    Returns:
        tuple: (beat_relationship, lost_relationship, tooltips)
    """
    import itertools
    
    beat_relationship = {}
    lost_relationship = {}
    tooltips = {}
    
    dice_names = sorted(dice_values.keys())
    
    # For each die, determine which other dice it beats
    for name in dice_names:
        beat_relationship[name] = []
        
        for other_name in dice_names:
            if name != other_name:
                if wins(dice_values[name], dice_values[other_name]) > 0:
                    beat_relationship[name].append(other_name)
                    
                    # Create tooltip with winning percentage
                    win_pct = calculate_win_percentage(dice_values[name], dice_values[other_name])
                    tooltips[f"{name}-{other_name}"] = f"Die {name} beats Die {other_name} about {win_pct}% of the time"
    
    # Calculate lost_relationship based on combinations of (players-1) dice
    if players > 1:
        # For each combination of (players-1) dice...
        for dice_combo in itertools.combinations(dice_names, players-1):
            combo_key = ''.join(dice_combo)  # Create a key from the combination (e.g., "ABC")
            lost_relationship[combo_key] = []
            
            # Find all dice that beat ALL dice in this combination
            for die_name in dice_names:
                if die_name not in dice_combo:  # Only consider dice not in the combination
                    beats_all = True
                    for combo_die in dice_combo:
                        if combo_die not in beat_relationship[die_name]:
                            beats_all = False
                            break
                    
                    if beats_all:
                        lost_relationship[combo_key].append(die_name)
    
    return beat_relationship, lost_relationship, tooltips

def convert_dice_to_json(input_file, set_name="custom_dice", players=2):
    """
    Convert a dice text file to JSON format suitable for dice-sets.json
    
    Args:
        input_file (str): Path to the input text file
        set_name (str): Name for the dice set in the JSON
        players (int): Number of players for this dice set
    """
    dice_data = {}
    
    # Check if input file exists
    if not os.path.exists(input_file):
        print(f"Error: Input file '{input_file}' not found")
        return
    
    # Read the dice data from the text file
    with open(input_file, 'r') as file:
        lines = [line.strip() for line in file.readlines() if line.strip()]
    
    # Process each line (each die)
    dice_count = len(lines)
    if dice_count == 0:
        print("Error: No dice data found in the input file")
        return
    
    # Use letters for the dice names (A, B, C, ...)
    dice_names = list(string.ascii_uppercase)[:dice_count]
    
    # Create the dice dictionary
    dice = {}
    for i, line in enumerate(lines):
        if i < len(dice_names):  # Ensure we don't exceed available letters
            values = [int(val.strip()) for val in line.split(',')]
            dice[dice_names[i]] = values
    
    # Calculate relationships based on actual dice values
    beat_relationship, lost_relationship, tooltips = calculate_relationships(dice, players)
    
    # Extract base name from the file path for the set name
    base_name = os.path.basename(input_file)
    file_name = os.path.splitext(base_name)[0]
    display_name = file_name.replace("_", " ").title()
    
    # Create the full data structure
    dice_data = {
        "name": f"{display_name} Dice",
        "players": players,
        "diceCount": dice_count,
        "dice": dice,
        "beatRelationship": beat_relationship,
        "lostRelationship": lost_relationship,
        "info": f"<p>A custom set of {dice_count} dice with calculated relationships between each die.</p>",
        "tooltips": tooltips
    }
    
    # Analyze the relationships
    relationship_info = analyze_relationships(dice, beat_relationship)
    if relationship_info:
        dice_data["info"] += f"<p>{relationship_info}</p>"
    
    # Create the JSON output
    json_output = {
        set_name: dice_data
    }
    
    # Print the JSON with proper indentation
    json_string = json.dumps(json_output, indent=4)
    print(json_string)
    
    # Show how to use it
    print("\nTo use this in dice-sets.json, add the contents of the JSON object above to your dice-sets.json file.")

def analyze_relationships(dice, beat_relationship):
    """Analyze the relationship pattern to provide a description"""
    # Check if we have a cyclic relationship (like A beats B, B beats C, C beats A)
    dice_names = sorted(dice.keys())
    
    # Check for intransitivity
    has_cycle = False
    for i, name in enumerate(dice_names):
        for j, next_name in enumerate(dice_names):
            if next_name in beat_relationship[name]:
                for k, third_name in enumerate(dice_names):
                    if third_name != name and third_name != next_name:
                        if third_name in beat_relationship[next_name] and name in beat_relationship[third_name]:
                            has_cycle = True
                            break
    
    if has_cycle:
        return "This set demonstrates intransitivity - where relationships between dice form cycles rather than a linear hierarchy."
    else:
        return "The relationships between these dice form a hierarchy rather than intransitive cycles."

def print_usage():
    print("Usage: python3 convert_dice_data.py <input_file> [set_name] [players]")
    print("  <input_file>: Path to the dice text file")
    print("  [set_name]: Optional name for the dice set (default: derived from filename)")
    print("  [players]: Optional number of players (default: 2)")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: Input file is required")
        print_usage()
        sys.exit(1)
    
    input_file = sys.argv[1]
    
    set_name = None
    players = 2
    
    if len(sys.argv) > 2:
        set_name = sys.argv[2]
    else:
        # Default set name based on the file name
        base_name = os.path.basename(input_file)
        set_name = os.path.splitext(base_name)[0]
    
    if len(sys.argv) > 3:
        try:
            players = int(sys.argv[3])
        except ValueError:
            print("Error: players must be an integer")
            print_usage()
            sys.exit(1)
    
    convert_dice_to_json(input_file, set_name, players)