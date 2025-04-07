document.addEventListener('DOMContentLoaded', () => {
    // State variables
    let diceSets = {};
    let currentSet = 'classic';
    let currentDice = {};
    let diceElements = {};
    let results = {};
    let selectedDice = [];
    let highlightedDice = [];
    
    // DOM Elements
    const diceContainer = document.getElementById('dice-container');
    const resultsContainer = document.getElementById('results-container');
    const rollButton = document.getElementById('rollButton');
    const resetButton = document.getElementById('resetButton');
    const simulateButton = document.getElementById('simulateButton');
    const currentSetTitle = document.getElementById('current-set-title');
    const currentDiceInfo = document.getElementById('current-dice-info');
    
    // Load dice sets from JSON file
    async function loadDiceSets() {
        try {
            const response = await fetch('data/dice-sets.json');
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            diceSets = await response.json();
            
            // Initialize the application after loading the data
            init();
        } catch (error) {
            console.error('Error loading dice sets:', error);
            document.getElementById('error-message').textContent = 'Failed to load dice sets. Please try refreshing the page.';
        }
    }
    
    // Function to build sidebar dynamically from JSON data
    function buildSidebar() {
        const sidebarList = document.querySelector('.dice-sets');
        sidebarList.innerHTML = ''; // Clear existing sidebar items
        
        // Create list items for each dice set
        for (const [key, set] of Object.entries(diceSets)) {
            const listItem = document.createElement('li');
            listItem.className = 'dice-set';
            listItem.setAttribute('data-set', key);
            
            if (key === currentSet) {
                listItem.classList.add('active');
            }
            
            // Create short description based on players and dice count
            const playerText = set.players ? `${set.players} players` : '';
            const diceText = set.diceCount ? `${set.diceCount} dice` : '';
            const description = [playerText, diceText].filter(Boolean).join(', ');
            
            listItem.innerHTML = `
                <h3>${set.name}</h3>
                <p>${description}</p>
            `;
            
            sidebarList.appendChild(listItem);
        }
    }
    
    // Initialize the application
    function init() {
        // Set up current dice
        currentDice = diceSets[currentSet].dice;
        
        // Build sidebar dynamically
        buildSidebar();
        
        // Set up event listeners for dice set selection
        const diceSetsElements = document.querySelectorAll('.dice-set');
        diceSetsElements.forEach(element => {
            element.addEventListener('click', () => {
                const setName = element.getAttribute('data-set');
                if (setName !== currentSet) {
                    changeSet(setName);
                    
                    // Update active state in sidebar
                    diceSetsElements.forEach(el => el.classList.remove('active'));
                    element.classList.add('active');
                }
            });
        });
        
        // Set up the initial dice set
        setupDiceSet(currentSet);
        
        // Event listeners for buttons
        rollButton.addEventListener('click', rollAllDice);
        resetButton.addEventListener('click', resetResults);
        simulateButton.addEventListener('click', simulateRolls);
    }
    
    // Toggle die selection for simulation
    function toggleDieSelection(dieKey) {
        const dieNode = diceElements[dieKey];
        const set = diceSets[currentSet];
        const diceKeys = Object.keys(currentDice);
        const totalDiceCount = diceKeys.length;
        
        // Get the player count from the current set, default to total dice count if not defined
        const playerCount = set.players || totalDiceCount;
        
        // Check if already selected
        const index = selectedDice.indexOf(dieKey);
        
        if (index === -1) {
            // Not selected, add to selection if under limit
            if (selectedDice.length < playerCount - 1) {
                selectedDice.push(dieKey);
                dieNode.classList.add('selected');
            }
        } else {
            // Already selected, remove from selection
            selectedDice.splice(index, 1);
            dieNode.classList.remove('selected');
        }
        
        // Clear previous highlighting
        highlightedDice.forEach(key => {
            if (diceElements[key]) {
                diceElements[key].classList.remove('highlighted');
            }
        });
        highlightedDice = [];
        
        // Show all dice and results initially
        showAllDiceAndResults();
        
        // If we have (players-1) dice selected, find the winning die
        if (selectedDice.length === playerCount - 1 && playerCount > 1) {
            const winningDie = findWinningDie(selectedDice);
            if (winningDie) {
                // Highlight winning die and selected dice
                highlightedDice = [...selectedDice, winningDie];
                
                highlightedDice.forEach(key => {
                    if (diceElements[key]) {
                        diceElements[key].classList.add('highlighted');
                    }
                });
                
                // Hide unselected dice in the graph
                hideUnselectedDice(highlightedDice);
                
                // Hide unrelated results in the results table
                updateResultsVisibility(highlightedDice);
                
                // Display notification
                const notification = document.createElement('div');
                notification.className = 'notification';
                notification.textContent = `Based on the relationships, Die ${winningDie} beats all selected dice! Automatically rolling these dice.`;
                
                // Append notification to container
                const container = document.querySelector('.dice-container');
                
                // Remove any existing notification
                const existingNotification = document.querySelector('.notification');
                if (existingNotification) {
                    existingNotification.remove();
                }
                
                container.appendChild(notification);
                
                // Auto-hide notification after 5 seconds
                setTimeout(() => {
                    notification.classList.add('hide');
                    setTimeout(() => notification.remove(), 500);
                }, 5000);
                
                // Automatically roll these dice once
                setTimeout(() => rollAllDice(), 800);
            }
        }
    }
    
    // Find a die that can beat all selected dice
    function findWinningDie(selectedDiceKeys) {
        const set = diceSets[currentSet];
        const allDiceKeys = Object.keys(currentDice);
        
        // Get all dice not in selection
        const remainingDice = allDiceKeys.filter(key => !selectedDiceKeys.includes(key));
        
        if (!set.beatRelationship) {
            return remainingDice[0]; // Fallback if no beat relationship defined
        }
        
        // Check if we have selected the right number of dice based on players property
        // Each dice set has a "players" property that indicates how many players should be selected
        // We need to select (players - 1) dice, and find one that can beat all of them
        if (set.players && selectedDiceKeys.length === set.players - 1) {
            // First try using lostRelationship if available
            if (set.lostRelationship) {
                // Find a die that all selected dice lose to
                for (const dieKey of remainingDice) {
                    let isWinningDie = true;
                    
                    for (const selectedDie of selectedDiceKeys) {
                        // Check if the selected die has the current die in its lostRelationship
                        const losesTo = set.lostRelationship[selectedDie] || [];
                        if (!losesTo.includes(dieKey)) {
                            isWinningDie = false;
                            break;
                        }
                    }
                    
                    if (isWinningDie) {
                        return dieKey;
                    }
                }
            }
            
            // Fallback to using beat relationship if lostRelationship didn't work
            for (const dieKey of remainingDice) {
                // Get all dice this die can beat
                const canBeat = set.beatRelationship[dieKey] || [];
                
                // For every selected die, check if it's in the canBeat list
                let canBeatAll = true;
                for (const selectedDie of selectedDiceKeys) {
                    if (!canBeat.includes(selectedDie)) {
                        // Check for indirect win path (transitive relationship)
                        let hasIndirectPath = false;
                        
                        for (const intermediateDie of canBeat) {
                            if (set.beatRelationship[intermediateDie] && 
                                set.beatRelationship[intermediateDie].includes(selectedDie)) {
                                hasIndirectPath = true;
                                break;
                            }
                        }
                        
                        if (!hasIndirectPath) {
                            canBeatAll = false;
                            break;
                        }
                    }
                }
                
                if (canBeatAll) {
                    return dieKey;
                }
            }
        }
        
        // If no single die can beat all selected dice, return a random one
        return remainingDice[Math.floor(Math.random() * remainingDice.length)];
    }
    
    // Change to a different dice set
    function changeSet(setName) {
        if (diceSets[setName]) {
            currentSet = setName;
            currentDice = diceSets[setName].dice;
            setupDiceSet(setName);
            resetResults();
            
            // Update active class in sidebar
            document.querySelectorAll('.dice-set').forEach(el => {
                if (el.getAttribute('data-set') === setName) {
                    el.classList.add('active');
                } else {
                    el.classList.remove('active');
                }
            });
            
            // Reset die details view
            document.querySelector('.die-select-prompt').style.display = 'block';
            document.getElementById('die-details-content').style.display = 'none';
            
            // Reset selection
            selectedDice = [];
            highlightedDice = [];
            
            // Remove any existing notification
            const existingNotification = document.querySelector('.notification');
            if (existingNotification) {
                existingNotification.remove();
            }
        }
    }
    
    // Setup the dice set UI
    function setupDiceSet(setName) {
        const set = diceSets[setName];
        
        // Update title and info
        currentSetTitle.textContent = set.name;
        
        // Add player count information to the info display
        const playerInfo = set.players ? 
            `<p class="player-info"><strong>Players:</strong> ${set.players} (select ${set.players - 1} dice to find a winning die)</p>` : '';
        currentDiceInfo.innerHTML = playerInfo + set.info;
        
        // Clear containers
        diceContainer.innerHTML = '';
        resultsContainer.innerHTML = '';
        
        // Create visualization graph
        const diceKeys = Object.keys(set.dice);
        diceElements = {};
        
        // Create graph container
        const graphContainer = document.createElement('div');
        graphContainer.className = 'graph-container';
        diceContainer.appendChild(graphContainer);
        
        // Create dice nodes
        const nodeSize = 60;
        const centerX = 250;
        const centerY = 200;
        const radius = 150;
        
        // Calculate node positions in a circle
        const nodes = {};
        diceKeys.forEach((key, index) => {
            const angle = (index / diceKeys.length) * 2 * Math.PI;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            
            nodes[key] = { x, y, key };
            
            // Create node element
            const node = document.createElement('div');
            node.className = `die-node die${key}`;
            node.id = `die${key}`;
            node.style.left = `${x}px`;
            node.style.top = `${y}px`;
            node.style.transform = 'translate(-50%, -50%)';
            node.innerHTML = `
                <div class="die-key">Die ${key}</div>
                <div class="die-face">?</div>
            `;
            // Add click event to show die details and select dice
            node.addEventListener('click', () => {
                showDieDetails(key);
                toggleDieSelection(key);
            });
            
            graphContainer.appendChild(node);
            diceElements[key] = node;
        });
        
        // Create SVG overlay for arrows
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('class', 'relationship-svg');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.pointerEvents = 'none';
        graphContainer.appendChild(svg);
        
        // Create relationship arrows
        if (set.beatRelationship) {
            for (const firstKey in set.beatRelationship) {
                const beatenDice = set.beatRelationship[firstKey];
                
                beatenDice.forEach(nextKey => {
                    drawArrow(svg, nodes[firstKey], nodes[nextKey], firstKey, nextKey);
                });
            }
        } else {
            // Fallback to sequential relationships if not defined
            for (let i = 0; i < diceKeys.length; i++) {
                const firstKey = diceKeys[i];
                const nextKey = diceKeys[(i + 1) % diceKeys.length];
                
                drawArrow(svg, nodes[firstKey], nodes[nextKey], firstKey, nextKey);
            }
        }
        
        // Create result rows
        results = {};
        
        // Initialize results object based on beat relationships if available
        if (set.beatRelationship) {
            for (const firstKey in set.beatRelationship) {
                const beatenDice = set.beatRelationship[firstKey];
                
                beatenDice.forEach(nextKey => {
                    // Set up the result keys
                    const winKey1 = `${firstKey}vs${nextKey}Wins`;
                    const winKey2 = `${nextKey}vs${firstKey}Wins`;
                    results[winKey1] = 0;
                    results[winKey2] = 0;
                    
                    // Create result row
                    const resultRow = document.createElement('div');
                    resultRow.className = 'result-row';
                    resultRow.id = `result-${firstKey}-${nextKey}`;
                    resultRow.innerHTML = `
                        <div>${firstKey} vs ${nextKey}: <span id="${winKey1}">0</span> - <span id="${winKey2}">0</span></div>
                        <div class="win-percentage">(<span id="${firstKey}vs${nextKey}">0</span>%)</div>
                    `;
                    resultsContainer.appendChild(resultRow);
                    
                    // Add tooltip if available
                    if (set.tooltips && set.tooltips[`${firstKey}-${nextKey}`]) {
                        addTooltip(resultRow, set.tooltips[`${firstKey}-${nextKey}`]);
                    }
                });
            }
        } else {
            // Fallback to sequential comparison if beatRelationship is not defined
            for (let i = 0; i < diceKeys.length; i++) {
                const firstKey = diceKeys[i];
                const nextKey = diceKeys[(i + 1) % diceKeys.length];
                
                // Set up the result keys
                const winKey1 = `${firstKey}vs${nextKey}Wins`;
                const winKey2 = `${nextKey}vs${firstKey}Wins`;
                results[winKey1] = 0;
                results[winKey2] = 0;
                
                // Create result row
                const resultRow = document.createElement('div');
                resultRow.className = 'result-row';
                resultRow.id = `result-${firstKey}-${nextKey}`;
                resultRow.innerHTML = `
                    <div>${firstKey} vs ${nextKey}: <span id="${winKey1}">0</span> - <span id="${winKey2}">0</span></div>
                    <div class="win-percentage">(<span id="${firstKey}vs${nextKey}">0</span>%)</div>
                `;
                resultsContainer.appendChild(resultRow);
                
                // Add tooltip if available
                if (set.tooltips && set.tooltips[`${firstKey}-${nextKey}`]) {
                    addTooltip(resultRow, set.tooltips[`${firstKey}-${nextKey}`]);
                }
            }
        }
    }
    
    // Draw an arrow between two nodes
    function drawArrow(svg, startNode, endNode, startKey, endKey) {
        const arrowId = `arrow-${startKey}-${endKey}`;
        
        // Calculate arrow position
        const nodeSize = 60;
        const startX = startNode.x;
        const startY = startNode.y;
        const endX = endNode.x;
        const endY = endNode.y;
        
        // Calculate direction vector
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Normalize the direction vector
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Calculate start and end points (offset from node centers to avoid overlapping with nodes)
        const startOffsetX = startX + nx * (nodeSize / 2);
        const startOffsetY = startY + ny * (nodeSize / 2);
        const endOffsetX = endX - nx * (nodeSize / 2);
        const endOffsetY = endY - ny * (nodeSize / 2);
        
        // Create arrow line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        line.setAttribute('id', arrowId);
        line.setAttribute('d', `M ${startOffsetX} ${startOffsetY} L ${endOffsetX} ${endOffsetY}`);
        line.setAttribute('stroke', '#555');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('marker-end', 'url(#arrowhead)');
        line.setAttribute('class', 'relationship-arrow');
        
        // Create arrow result element
        const resultCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        resultCircle.setAttribute('id', `circle-${startKey}-${endKey}`);
        resultCircle.setAttribute('cx', startOffsetX + (endOffsetX - startOffsetX) / 2);
        resultCircle.setAttribute('cy', startOffsetY + (endOffsetY - startOffsetY) / 2);
        resultCircle.setAttribute('r', '12');
        resultCircle.setAttribute('fill', '#fff');
        resultCircle.setAttribute('stroke', '#555');
        resultCircle.setAttribute('stroke-width', '1');
        resultCircle.setAttribute('class', 'result-circle');
        
        const resultText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        resultText.setAttribute('id', `percent-${startKey}-${endKey}`);
        resultText.setAttribute('x', startOffsetX + (endOffsetX - startOffsetX) / 2);
        resultText.setAttribute('y', startOffsetY + (endOffsetY - startOffsetY) / 2 + 4);
        resultText.setAttribute('text-anchor', 'middle');
        resultText.setAttribute('font-size', '10');
        resultText.setAttribute('font-weight', 'bold');
        resultText.textContent = '0%';
        
        // Add arrowhead marker if it doesn't exist yet
        let marker = svg.querySelector('#arrowhead');
        if (!marker) {
            marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
            marker.setAttribute('id', 'arrowhead');
            marker.setAttribute('markerWidth', '10');
            marker.setAttribute('markerHeight', '7');
            marker.setAttribute('refX', '9');
            marker.setAttribute('refY', '3.5');
            marker.setAttribute('orient', 'auto');
            
            const markerPath = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            markerPath.setAttribute('points', '0 0, 10 3.5, 0 7');
            markerPath.setAttribute('fill', '#555');
            
            marker.appendChild(markerPath);
            svg.appendChild(marker);
        }
        
        // Add all elements to SVG
        svg.appendChild(line);
        svg.appendChild(resultCircle);
        svg.appendChild(resultText);
    }
    
    // Roll a single die
    function rollDie(dieArray) {
        const randomIndex = Math.floor(Math.random() * dieArray.length);
        return dieArray[randomIndex];
    }
    
    // Roll all dice and update UI
    function rollAllDice() {
        let diceToRoll;
        
        // If we have highlighted dice, use only those
        if (highlightedDice.length > 0) {
            diceToRoll = highlightedDice;
            
            // Hide unselected dice
            hideUnselectedDice(highlightedDice);
            
            // Update results visibility
            updateResultsVisibility(highlightedDice);
        } else {
            diceToRoll = Object.keys(currentDice);
            
            // Show all dice and results
            showAllDiceAndResults();
        }
        
        const rolls = {};
        
        // Roll each die
        diceToRoll.forEach(key => {
            rolls[key] = rollDie(currentDice[key]);
            const dieFace = diceElements[key].querySelector('.die-face');
            if (dieFace) {
                dieFace.textContent = rolls[key];
            }
        });
        
        // Show question mark for dice not rolled
        Object.keys(currentDice).forEach(key => {
            if (!diceToRoll.includes(key)) {
                const dieFace = diceElements[key].querySelector('.die-face');
                if (dieFace) {
                    dieFace.textContent = '?';
                }
            }
        });
        
        // Animate only the rolled dice
        const diceElementsToAnimate = diceToRoll.map(key => diceElements[key]);
        animateDice(diceElementsToAnimate);
        
        // Compare dice and update results
        compareDice(rolls);
    }
    
    // Compare dice rolls and update results
    function compareDice(rolls) {
        const diceKeys = Object.keys(rolls);
        const set = diceSets[currentSet];
        
        // If we're using the beat relationships from the JSON
        if (set.beatRelationship) {
            // Compare based on the defined beat relationships
            for (const firstKey in set.beatRelationship) {
                const beatenDice = set.beatRelationship[firstKey];
                
                beatenDice.forEach(nextKey => {
                    const roll1 = rolls[firstKey];
                    const roll2 = rolls[nextKey];
                    
                    if (roll1 > roll2) {
                        results[`${firstKey}vs${nextKey}Wins`]++;
                    } else if (roll2 > roll1) {
                        results[`${nextKey}vs${firstKey}Wins`]++;
                    }
                });
            }
        } else {
            // Fallback to the old sequential comparison method
            for (let i = 0; i < diceKeys.length; i++) {
                const firstKey = diceKeys[i];
                const nextKey = diceKeys[(i + 1) % diceKeys.length];
                
                const roll1 = rolls[firstKey];
                const roll2 = rolls[nextKey];
                
                if (roll1 > roll2) {
                    results[`${firstKey}vs${nextKey}Wins`]++;
                } else if (roll2 > roll1) {
                    results[`${nextKey}vs${firstKey}Wins`]++;
                }
            }
        }
        
        updateResults();
    }
    
    // Update UI with results
    function updateResults() {
        // Update win counts
        for (const [key, value] of Object.entries(results)) {
            const element = document.getElementById(key);
            if (element) element.textContent = value;
        }
        
        // Get all relationships that need updating
        const set = diceSets[currentSet];
        const relationships = [];
        
        if (set.beatRelationship) {
            for (const firstKey in set.beatRelationship) {
                const beatenDice = set.beatRelationship[firstKey];
                beatenDice.forEach(nextKey => {
                    relationships.push([firstKey, nextKey]);
                });
            }
        } else {
            const diceKeys = Object.keys(currentDice);
            for (let i = 0; i < diceKeys.length; i++) {
                const firstKey = diceKeys[i];
                const nextKey = diceKeys[(i + 1) % diceKeys.length];
                relationships.push([firstKey, nextKey]);
            }
        }
        
        // Update all relationships
        relationships.forEach(([firstKey, nextKey]) => {
            const wins1 = results[`${firstKey}vs${nextKey}Wins`];
            const wins2 = results[`${nextKey}vs${firstKey}Wins`];
            const total = wins1 + wins2;
            const winPercentage = total > 0 ? Math.round((wins1 / total) * 100) : 0;
            
            // Update the text percentage in results
            const percentElement = document.getElementById(`${firstKey}vs${nextKey}`);
            if (percentElement) {
                percentElement.textContent = winPercentage;
            }
            
            // Update the graph percentage
            const graphPercentElement = document.getElementById(`percent-${firstKey}-${nextKey}`);
            if (graphPercentElement) {
                graphPercentElement.textContent = `${winPercentage}%`;
            }
            
            // Update arrow styling based on win percentage
            const arrow = document.getElementById(`arrow-${firstKey}-${nextKey}`);
            const circle = document.getElementById(`circle-${firstKey}-${nextKey}`);
            
            if (arrow && circle) {
                // Update color based on win percentage
                if (total === 0) {
                    // No rolls yet - neutral
                    arrow.setAttribute('stroke', '#555');
                    circle.setAttribute('stroke', '#555');
                } else if (winPercentage > 50) {
                    // Strong advantage - green
                    arrow.setAttribute('stroke', '#2ecc71');
                    arrow.setAttribute('stroke-width', '3');
                    circle.setAttribute('stroke', '#2ecc71');
                } else if (winPercentage < 50) {
                    // Disadvantage - red (actually the arrow shows advantage for firstKey)
                    arrow.setAttribute('stroke', '#e74c3c');
                    arrow.setAttribute('stroke-width', '1');
                    circle.setAttribute('stroke', '#e74c3c');
                } else {
                    // Exactly 50% - yellow
                    arrow.setAttribute('stroke', '#f39c12');
                    arrow.setAttribute('stroke-width', '2');
                    circle.setAttribute('stroke', '#f39c12');
                }
            }
        });
        
        // Update selected die details if any is selected
        const selectedDieContent = document.getElementById('die-details-content');
        if (selectedDieContent.style.display === 'block') {
            // Get the selected die key from the title
            const selectedDieName = document.getElementById('selected-die-name').textContent;
            const selectedDieKey = selectedDieName.replace('Die ', '');
            
            // Refresh die details
            if (selectedDieKey && diceElements[selectedDieKey]) {
                showDieDetails(selectedDieKey);
            }
        }
    }
    
    // Hide unselected dice in the graph
    function hideUnselectedDice(visibleDice) {
        const allDiceKeys = Object.keys(currentDice);
        
        // Hide unselected dice nodes
        allDiceKeys.forEach(key => {
            if (!visibleDice.includes(key) && diceElements[key]) {
                diceElements[key].classList.add('hidden');
            }
        });
        
        // Hide relationships between unselected dice
        const relationshipArrows = document.querySelectorAll('.relationship-arrow');
        const resultCircles = document.querySelectorAll('.result-circle');
        const resultTexts = document.querySelectorAll('[id^="percent-"]');
        
        // Hide all arrows first
        relationshipArrows.forEach(arrow => {
            arrow.classList.add('hidden');
        });
        
        // Hide all result circles
        resultCircles.forEach(circle => {
            circle.classList.add('hidden');
        });
        
        // Hide all percent texts
        resultTexts.forEach(text => {
            text.classList.add('hidden');
        });
        
        // Show only relationships between visible dice
        visibleDice.forEach(firstKey => {
            visibleDice.forEach(secondKey => {
                if (firstKey !== secondKey) {
                    const arrow = document.getElementById(`arrow-${firstKey}-${secondKey}`);
                    const circle = document.getElementById(`circle-${firstKey}-${secondKey}`);
                    const text = document.getElementById(`percent-${firstKey}-${secondKey}`);
                    
                    if (arrow) arrow.classList.remove('hidden');
                    if (circle) circle.classList.remove('hidden');
                    if (text) text.classList.remove('hidden');
                }
            });
        });
    }
    
    // Show all dice and relationships
    function showAllDiceAndResults() {
        const allDiceKeys = Object.keys(currentDice);
        
        // Show all dice nodes
        allDiceKeys.forEach(key => {
            if (diceElements[key]) {
                diceElements[key].classList.remove('hidden');
            }
        });
        
        // Show all relationships
        const relationshipArrows = document.querySelectorAll('.relationship-arrow');
        const resultCircles = document.querySelectorAll('.result-circle');
        const resultTexts = document.querySelectorAll('[id^="percent-"]');
        
        relationshipArrows.forEach(arrow => {
            arrow.classList.remove('hidden');
        });
        
        resultCircles.forEach(circle => {
            circle.classList.remove('hidden');
        });
        
        resultTexts.forEach(text => {
            text.classList.remove('hidden');
        });
        
        // Show all result rows
        const resultRows = document.querySelectorAll('.result-row');
        resultRows.forEach(row => {
            row.classList.remove('hidden');
        });
    }
    
    // Update results visibility based on selected dice
    function updateResultsVisibility(visibleDice) {
        const resultRows = document.querySelectorAll('.result-row');
        
        // Hide all result rows first
        resultRows.forEach(row => {
            row.classList.add('hidden');
        });
        
        // Show only result rows that involve visible dice
        visibleDice.forEach(firstKey => {
            visibleDice.forEach(secondKey => {
                if (firstKey !== secondKey) {
                    const resultRow = document.getElementById(`result-${firstKey}-${secondKey}`);
                    if (resultRow) {
                        resultRow.classList.remove('hidden');
                    }
                }
            });
        });
    }
    
    // Reset all results
    function resetResults() {
        const diceKeys = Object.keys(currentDice);
        const set = diceSets[currentSet];
        
        // Reset result counters
        results = {};
        
        if (set.beatRelationship) {
            // Reset based on beat relationships
            for (const firstKey in set.beatRelationship) {
                const beatenDice = set.beatRelationship[firstKey];
                
                beatenDice.forEach(nextKey => {
                    results[`${firstKey}vs${nextKey}Wins`] = 0;
                    results[`${nextKey}vs${firstKey}Wins`] = 0;
                });
            }
        } else {
            // Fallback to sequential reset
            for (let i = 0; i < diceKeys.length; i++) {
                const firstKey = diceKeys[i];
                const nextKey = diceKeys[(i + 1) % diceKeys.length];
                results[`${firstKey}vs${nextKey}Wins`] = 0;
                results[`${nextKey}vs${firstKey}Wins`] = 0;
            }
        }
        
        // Reset dice faces
        diceKeys.forEach(key => {
            diceElements[key].querySelector('.die-face').textContent = '?';
        });
        
        // Clear selection and highlights
        selectedDice.forEach(key => {
            if (diceElements[key]) {
                diceElements[key].classList.remove('selected');
            }
        });
        
        highlightedDice.forEach(key => {
            if (diceElements[key]) {
                diceElements[key].classList.remove('highlighted');
            }
        });
        
        selectedDice = [];
        highlightedDice = [];
        
        // Show all dice and results
        showAllDiceAndResults();
        
        // Remove any existing notification
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        updateResults();
    }
    
    // Add animation to the dice
    function animateDice(diceElements) {
        diceElements.forEach(die => {
            // Save original transform for die nodes
            let originalTransform = '';
            if (die.classList.contains('die-node')) {
                originalTransform = 'translate(-50%, -50%)';
            }
            
            die.style.transform = originalTransform + ' scale(1.1)';
            setTimeout(() => {
                die.style.transform = originalTransform + ' scale(1)';
            }, 200);
        });
    }
    
    // Simulate multiple rolls
    function simulateRolls() {
        // Disable buttons during simulation
        rollButton.disabled = true;
        resetButton.disabled = true;
        simulateButton.disabled = true;
        
        let count = 0;
        const totalSimulations = 1000;
        
        // Determine which dice to simulate
        let diceToRoll;
        if (highlightedDice.length > 0) {
            diceToRoll = highlightedDice;
            
            // Hide unselected dice during simulation
            hideUnselectedDice(highlightedDice);
            
            // Update results visibility
            updateResultsVisibility(highlightedDice);
        } else {
            diceToRoll = Object.keys(currentDice);
            
            // Show all dice and results
            showAllDiceAndResults();
        }
        
        // If the number of highlighted dice equals the player count, show a special notification
        const set = diceSets[currentSet];
        const playerCount = set.players || Object.keys(currentDice).length;
        
        if (highlightedDice.length === playerCount) {
            // Display notification about simulating with optimally chosen dice
            const notification = document.createElement('div');
            notification.className = 'notification';
            notification.textContent = `Simulating ${totalSimulations} rolls with the optimal dice set!`;
            
            // Append notification to container
            const container = document.querySelector('.dice-container');
            
            // Remove any existing notification
            const existingNotification = document.querySelector('.notification');
            if (existingNotification) {
                existingNotification.remove();
            }
            
            container.appendChild(notification);
            
            // Auto-hide notification after 5 seconds
            setTimeout(() => {
                notification.classList.add('hide');
                setTimeout(() => notification.remove(), 500);
            }, 5000);
        }
        
        function doSimulation() {
            if (count < totalSimulations) {
                const rolls = {};
                
                // Roll only selected/highlighted dice
                diceToRoll.forEach(key => {
                    rolls[key] = rollDie(currentDice[key]);
                });
                
                // Compare dice and update results
                compareDice(rolls);
                
                // Update the display every 100 rolls
                if (count % 100 === 0) {
                    // Update the display for rolled dice
                    diceToRoll.forEach(key => {
                        const dieFace = diceElements[key].querySelector('.die-face');
                        if (dieFace) {
                            dieFace.textContent = rolls[key];
                        }
                    });
                    
                    // Keep other dice as question marks
                    Object.keys(currentDice).forEach(key => {
                        if (!diceToRoll.includes(key)) {
                            const dieFace = diceElements[key].querySelector('.die-face');
                            if (dieFace) {
                                dieFace.textContent = '?';
                            }
                        }
                    });
                }
                
                count++;
                
                // Use requestAnimationFrame to not block the UI
                requestAnimationFrame(doSimulation);
            } else {
                // Re-enable buttons after simulation
                rollButton.disabled = false;
                resetButton.disabled = false;
                simulateButton.disabled = false;
                
                // Animate the dice after simulation completes
                animateDice(diceToRoll.map(key => diceElements[key]));
            }
        }
        
        doSimulation();
    }
    
    // Add tooltips to explain probability
    function addTooltip(element, text) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = text;
        tooltip.style.display = 'none';
        tooltip.style.position = 'absolute';
        tooltip.style.backgroundColor = '#333';
        tooltip.style.color = 'white';
        tooltip.style.padding = '5px';
        tooltip.style.borderRadius = '3px';
        tooltip.style.zIndex = '100';
        tooltip.style.width = '220px';
        document.body.appendChild(tooltip);

        element.addEventListener('mouseover', (e) => {
            const rect = element.getBoundingClientRect();
            tooltip.style.left = `${rect.left}px`;
            tooltip.style.top = `${rect.bottom + 5}px`;
            tooltip.style.display = 'block';
        });

        element.addEventListener('mouseout', () => {
            tooltip.style.display = 'none';
        });
    }
    
    // Show die details in the sidebar
    function showDieDetails(dieKey) {
        const set = diceSets[currentSet];
        const dieValues = set.dice[dieKey];
        const dieDetailsContent = document.getElementById('die-details-content');
        const diePrompt = document.querySelector('.die-select-prompt');
        const dieName = document.getElementById('selected-die-name');
        const dieValue = document.getElementById('selected-die-value');
        const dieFacesList = document.getElementById('selected-die-faces-list');
        const dieStatsContent = document.getElementById('selected-die-stats-content');
        
        // Show die details and hide prompt
        dieDetailsContent.style.display = 'block';
        diePrompt.style.display = 'none';
        
        // Update die name and current value
        dieName.textContent = `Die ${dieKey}`;
        dieName.className = `die${dieKey}-color`;
        const currentFaceValue = diceElements[dieKey].querySelector('.die-face').textContent;
        dieValue.textContent = currentFaceValue !== '?' ? currentFaceValue : '?';
        
        // Update face values list
        dieFacesList.innerHTML = '';
        dieValues.forEach(value => {
            const listItem = document.createElement('li');
            listItem.textContent = value;
            dieFacesList.appendChild(listItem);
        });
        
        // Calculate and display statistics
        dieStatsContent.innerHTML = '';
        
        // Calculate min, max, average
        const min = Math.min(...dieValues);
        const max = Math.max(...dieValues);
        const avg = dieValues.reduce((sum, val) => sum + val, 0) / dieValues.length;
        
        const statsHtml = `
            <p><strong>Minimum:</strong> ${min}</p>
            <p><strong>Maximum:</strong> ${max}</p>
            <p><strong>Average:</strong> ${avg.toFixed(2)}</p>
        `;
        
        // Calculate and show win probabilities against other dice
        let winProbsHtml = '<p><strong>Win Probabilities:</strong></p>';
        if (set.beatRelationship && set.beatRelationship[dieKey]) {
            // Add wins
            set.beatRelationship[dieKey].forEach(otherDie => {
                const winCount = results[`${dieKey}vs${otherDie}Wins`] || 0;
                const lossCount = results[`${otherDie}vs${dieKey}Wins`] || 0;
                const total = winCount + lossCount;
                const winPercent = total > 0 ? Math.round((winCount / total) * 100) : 0;
                
                winProbsHtml += `<p>vs Die ${otherDie}: <strong>${winPercent}%</strong> (${winCount}/${total})</p>`;
            });
            
            // Add losses
            for (const otherDie in set.beatRelationship) {
                if (otherDie !== dieKey && set.beatRelationship[otherDie].includes(dieKey)) {
                    const winCount = results[`${dieKey}vs${otherDie}Wins`] || 0;
                    const lossCount = results[`${otherDie}vs${dieKey}Wins`] || 0;
                    const total = winCount + lossCount;
                    const winPercent = total > 0 ? Math.round((winCount / total) * 100) : 0;
                    
                    winProbsHtml += `<p>vs Die ${otherDie}: <strong>${winPercent}%</strong> (${winCount}/${total})</p>`;
                }
            }
        }
        
        dieStatsContent.innerHTML = statsHtml + winProbsHtml;
    }
    
    // Start the application by loading dice sets
    loadDiceSets();
});
