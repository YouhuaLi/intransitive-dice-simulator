#!/usr/bin/env python3

import json
import string
import sys
import os
import numpy as np
from collections import defaultdict

def calculate_win_percentage(d1, d2):
    """Calculate the percentage of time d1 beats d2"""
    total_comparisons = len(d1) * len(d2)
    wins_count = sum([1 for i in d1 for j in d2 if i > j])
    return round((wins_count / total_comparisons) * 100, 1)

def calculate_relationships(dice_values, players=2):
    """
    Calculate beat relationships between dice based on relative win percentages
    
    Args:
        dice_values (dict): Dictionary mapping die names to their face values
        players (int): Number of players for this dice set
    
    Returns:
        tuple: (beat_relationship, lost_relationship, tooltips)
    """
    import itertools
    import decimal
    import math
    
    # Use Decimal for precise calculations
    decimal.getcontext().prec = 28
    
    beat_relationship = {}
    lost_relationship = {}
    tooltips = {}
    
    dice_names = sorted(dice_values.keys())
    
    # Calculate all win percentages first with higher precision
    win_percentages = {}
    all_win_diffs = []  # Track all win percentage differences to detect special cases
    
    for name in dice_names:
        for other_name in dice_names:
            if name != other_name:
                total_comparisons = len(dice_values[name]) * len(dice_values[other_name])
                wins_count = sum([1 for i in dice_values[name] for j in dice_values[other_name] if i > j])
                # Use Decimal for precise calculation
                win_pct_precise = decimal.Decimal(wins_count) / decimal.Decimal(total_comparisons)
                # Rounded version for display only
                win_pct_display = round(float(win_pct_precise) * 100, 1)
                win_percentages[(name, other_name)] = (win_pct_precise, win_pct_display)
                
    # Calculate typical win percentage difference
    for name in dice_names:
        for other_name in dice_names:
            if name != other_name:
                win_pct_precise, _ = win_percentages[(name, other_name)]
                reverse_win_pct_precise, _ = win_percentages[(other_name, name)]
                
                # Track the absolute difference in win rates
                diff = abs(win_pct_precise - reverse_win_pct_precise)
                all_win_diffs.append(diff)
    
    # Print some statistics to understand the relationships
    if all_win_diffs:
        avg_diff = sum(all_win_diffs) / len(all_win_diffs)
        max_diff = max(all_win_diffs)
        print(f"Statistics: Average win difference: {float(avg_diff)*100:.6f}%, Max difference: {float(max_diff)*100:.6f}%")
        
        # Force non-balanced set - we'll look for even tiny advantages
        is_balanced_set = False
    
    # If we have a balanced set, create some interesting relationships
    if is_balanced_set:
        # For a balanced set, we'll create a cycle: A > B > C > ... > A
        for i, name in enumerate(dice_names):
            next_idx = (i + 1) % len(dice_names)
            next_name = dice_names[next_idx]
            beat_relationship[name] = [next_name]
            
            # Update tooltip to indicate this is artificially created
            tooltips[f"{name}-{next_name}"] = f"Die {name} is balanced with Die {next_name} (artificial relationship created)"
    else:
        # Normal case - determine beat relationships based on win percentages
        for name in dice_names:
            beat_relationship[name] = []
            
            for other_name in dice_names:
                if name != other_name:
                    win_pct_precise, win_pct_display = win_percentages[(name, other_name)]
                    reverse_win_pct_precise, reverse_win_pct_display = win_percentages[(other_name, name)]
                    
                    # Create tooltip with winning percentage
                    # tooltips[f"{name}-{other_name}"] = f"Die {name} beats Die {other_name} about {win_pct_display}% of the time"
                    
                    # Add to beat relationship if this die has ANY advantage at all
                    # Use a VERY small epsilon - we want to capture even tiny advantages
                    epsilon = decimal.Decimal('0.0000001')  # Tiny advantage needed for intransitive dice
                    if win_pct_precise > reverse_win_pct_precise + epsilon:
                        beat_relationship[name].append(other_name)
                        # For close relationships, print a special debug message
                        diff_pct = float(win_pct_precise - reverse_win_pct_precise) * 100
                        if abs(diff_pct) < 0.1:  # If difference is less than 0.1%
                            print(f"Detected relationship: {name} beats {other_name} by {diff_pct:.8f}%")
    
    # Calculate lost_relationship based on combinations of (players-1) dice
    if players > 1:
        # For each combination of (players-1) dice...
        for dice_combo in itertools.combinations(dice_names, players-1):
            combo_key = ''.join(dice_combo)  # Create a key from the combination (e.g., "AB")
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
    # relationship_info = analyze_relationships(dice, beat_relationship)
    # if relationship_info:
    #     dice_data["info"] += f"<p>{relationship_info}</p>"
    
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
    
    # Check if every die has both winning and losing relationships
    has_wins = {name: len(beat_relationship[name]) > 0 for name in dice_names}
    has_losses = {name: any(name in beat_relationship[other] for other in dice_names) for name in dice_names}
    
    # Count total relationships
    total_relationships = sum(len(winners) for winners in beat_relationship.values())
    
    # Check for intransitivity (cycles of length 3+)
    has_cycle = False
    cycles = set()  # Use a set to avoid duplicates
    
    # Find all cycles of length 3
    for name in dice_names:
        for second in beat_relationship[name]:
            for third in beat_relationship.get(second, []):
                if name in beat_relationship.get(third, []):
                    has_cycle = True
                    # Keep the cycle in detection order to show the actual cycle
                    cycles.add(f"{name} beats {second}, {second} beats {third}, {third} beats {name}")
    
    # Count how many dice have both wins and losses
    intransitive_dice_count = sum(1 for name in dice_names if has_wins[name] and has_losses[name])
    
    if has_cycle:
        if len(cycles) > 5:  # If too many cycles, just report the count
            return f"This set demonstrates intransitivity with {len(cycles)} different cycles detected."
        elif cycles:
            cycle_description = "; ".join(cycles)
            return f"This set demonstrates intransitivity with the following cycle(s): {cycle_description}"
        else:
            return "This set demonstrates intransitivity."
    elif intransitive_dice_count > 0:
        # Even without a cycle, if dice have both wins and losses, it's partial intransitivity
        if total_relationships > 0:
            return f"This set shows partial intransitivity with {intransitive_dice_count} dice having both wins and losses."
    
    if total_relationships == 0:
        return "This set has no definitive winning relationships detected."
    else:
        return "This set does not demonstrate intransitivity (no cycles found)."

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
