# Game Mode Selection & Combination Shots Implementation Plan

## Research Summary

### Game Rules & Legal Target Balls

| Game | Balls | Target Rule | Any Ball? | Rotation? | Suit? | Pocket Rule |
|------|-------|-------------|-----------|-----------|-------|-------------|
| **8-Ball** | 1-7 solids, 9-15 stripes, 8 | Must hit your suit first | No | No | Yes | Any pocket (call pocket) |
| **9-Ball** | 1-9 | Must hit lowest numbered ball first | No | Yes | No | Any pocket (slop counts) |
| **10-Ball** | 1-10 | Must hit lowest numbered ball first | No | Yes | No | Call pocket |
| **Straight Pool (14.1)** | 1-15 | Any ball, call shot | Yes | No | No | Call pocket |
| **One Pocket** | 1-15 | Any ball | Yes | No | No | Your designated pocket only |

### Combination Shot Physics

A **combination shot** hits one object ball (OB1) into another (OB2) to pocket OB2.

**Key Physics:**
- Use ghost ball method for OB1 → OB2 contact point
- OB1 travels along the line from cue impact through OB1 center
- OB2 travels along the line from OB1 contact point through OB2 center toward pocket
- Cut angle compounds: small errors in first contact magnify at second contact
- Generally harder than direct shots (error propagation)

### When to Suggest Combination Shots

Combinations are useful when:
1. Direct path to target ball is blocked
2. All kick shot paths are blocked
3. A "helper ball" is positioned between target and pocket
4. In rotation games, lowest ball can combo into higher ball toward pocket

---

## Implementation Plan

### Phase 1: Game Mode Data Structure & UI

#### 1.1 Define Game Mode Constants
```javascript
const GAME_MODES = {
  EIGHT_BALL: {
    id: '8ball',
    name: '8-Ball',
    balls: 15,
    targetRule: 'suit',      // Must hit your suit first
    suitGroups: {
      solids: ['1','2','3','4','5','6','7'],
      stripes: ['9','10','11','12','13','14','15'],
      eight: ['8']
    },
    callPocket: true,
    comboAllowed: true,       // Can combo into any ball of your suit
    comboMustHitSuitFirst: true
  },
  NINE_BALL: {
    id: '9ball',
    name: '9-Ball',
    balls: 9,
    targetRule: 'rotation',   // Must hit lowest ball first
    callPocket: false,        // Slop counts
    comboAllowed: true,       // Can combo lowest into 9 to win
    comboMustHitLowestFirst: true
  },
  TEN_BALL: {
    id: '10ball',
    name: '10-Ball',
    balls: 10,
    targetRule: 'rotation',
    callPocket: true,
    comboAllowed: true,
    comboMustHitLowestFirst: true
  },
  STRAIGHT_POOL: {
    id: '14.1',
    name: 'Straight Pool',
    balls: 15,
    targetRule: 'any',        // Any ball is legal
    callPocket: true,
    comboAllowed: true,
    comboAnyBall: true
  },
  ONE_POCKET: {
    id: '1pocket',
    name: 'One Pocket',
    balls: 15,
    targetRule: 'any',
    callPocket: false,        // No call, but only your pocket counts
    pocketRestriction: true,  // Only 2 pockets are scoring pockets
    comboAllowed: true,
    comboAnyBall: true
  }
};
```

#### 1.2 Add Game Mode UI Selector
- Add dropdown or radio group above the Shot Solver section
- Options: 8-Ball, 9-Ball, 10-Ball, Straight Pool, One Pocket
- Default: 9-Ball (most common for practice)

#### 1.3 Track Game State
```javascript
let currentGameMode = GAME_MODES.NINE_BALL;
let playerSuit = null;        // For 8-ball: 'solids' or 'stripes'
let playerPocket = null;      // For One Pocket: 'corner-bl' or 'corner-br'
let lowestBallOnTable = 1;    // For rotation games
```

### Phase 2: Legal Target Ball Detection

#### 2.1 Function: Get Legal Target Balls
```javascript
function getLegalTargetBalls(gameMode, ballsOnTable, playerSuit) {
  // Returns array of ball IDs that are legal to hit first
  switch (gameMode.targetRule) {
    case 'rotation':
      // Find lowest numbered ball on table
      const lowest = findLowestBall(ballsOnTable);
      return [lowest];
    case 'suit':
      // Return all balls of player's suit
      return ballsOnTable.filter(b => gameMode.suitGroups[playerSuit].includes(b));
    case 'any':
      // All balls are legal targets
      return ballsOnTable.filter(b => b !== 'cue' && b !== 'ghost');
  }
}
```

#### 2.2 Function: Find Lowest Ball on Table
```javascript
function findLowestBall(ballsOnTable) {
  const numbered = ballsOnTable
    .filter(id => !isNaN(parseInt(id)))
    .map(id => parseInt(id))
    .sort((a, b) => a - b);
  return numbered.length > 0 ? String(numbered[0]) : null;
}
```

#### 2.3 Visual Indicator for Legal Balls
- Highlight legal target balls with a subtle glow or border
- Gray out / dim balls that cannot be hit first
- Show "Must hit X first" warning if wrong ball selected

### Phase 3: Combination Shot Detection

#### 3.1 Function: Find Combination Shots
```javascript
function findCombinationShots(cuePos, targetBallId, pocketPos, gameMode) {
  // Find all balls that could be "combo balls" (OB1 → targetBall → pocket)
  const combos = [];

  for (const helperBallId of ballsOnTable) {
    if (helperBallId === targetBallId || helperBallId === 'cue') continue;

    // Check if helper ball is between target and pocket (roughly)
    const helperPos = ballPositions[helperBallId];
    const targetPos = ballPositions[targetBallId];

    // Calculate ghost ball position for helper → target
    const helperToTarget = vectorNormalize(vectorSubtract(targetPos, helperPos));
    const helperGhostPos = vectorSubtract(targetPos, vectorScale(helperToTarget, GHOST_BALL_OFFSET));

    // Calculate ghost ball position for target → pocket
    const targetToPocket = vectorNormalize(vectorSubtract(pocketPos, targetPos));
    const targetGhostPos = vectorSubtract(targetPos, vectorScale(targetToPocket, GHOST_BALL_OFFSET));

    // Check alignment: is helper ball roughly aligned to push target toward pocket?
    const alignment = dotProduct(helperToTarget, targetToPocket);
    if (alignment < 0.3) continue; // Not aligned enough

    // Check if cue can reach helper ghost (path clear)
    if (!isDirectPathClear(cuePos, helperGhostPos, helperBallId)) continue;

    // Check if helper can reach target (path clear)
    if (!isDirectPathClear(helperPos, targetPos, targetBallId)) continue;

    // Check if target can reach pocket (path clear)
    if (!isDirectPathClear(targetPos, pocketPos, null)) continue;

    // Valid combination found
    combos.push({
      helperBallId,
      helperGhostPos,
      targetBallId,
      targetGhostPos,
      alignment,
      cutAngle1: calculateCutAngle(cuePos, helperGhostPos, helperPos, targetPos),
      cutAngle2: calculateCutAngle(helperPos, targetPos, pocketPos)
    });
  }

  // Sort by alignment (best first) and cut angle (lower is easier)
  return combos.sort((a, b) => {
    const aScore = a.alignment - (a.cutAngle1 + a.cutAngle2) / 90;
    const bScore = b.alignment - (b.cutAngle1 + b.cutAngle2) / 90;
    return bScore - aScore;
  });
}
```

#### 3.2 Validate Combination for Game Rules
```javascript
function isComboLegalForGameMode(combo, gameMode, playerSuit) {
  // In rotation games, must hit lowest ball first
  if (gameMode.comboMustHitLowestFirst) {
    const lowest = findLowestBall(Object.keys(ballPositions));
    if (combo.helperBallId !== lowest) return false;
  }

  // In 8-ball, must hit your suit first
  if (gameMode.comboMustHitSuitFirst) {
    if (!gameMode.suitGroups[playerSuit].includes(combo.helperBallId)) return false;
  }

  return true;
}
```

### Phase 4: Combination Shot Visualization

#### 4.1 Add Combo Path SVG Elements
```html
<!-- Combination shot path indicators -->
<g id="combo-shot-indicator" visibility="hidden">
  <!-- Path from cue to helper ball -->
  <path id="combo-path-1" stroke="#ff9900" stroke-width="0.3" stroke-dasharray="0.8,0.4" fill="none"/>
  <!-- Path from helper to target -->
  <path id="combo-path-2" stroke="#ff6600" stroke-width="0.3" fill="none"/>
  <!-- Path from target to pocket -->
  <path id="combo-path-3" stroke="#ff3300" stroke-width="0.3" fill="none"/>
  <!-- Helper ball ghost indicator -->
  <circle id="combo-ghost-1" r="1.125" fill="rgba(255,153,0,0.2)" stroke="#ff9900"/>
  <!-- Label -->
  <text id="combo-label" font-size="1.2" fill="#ff9900">COMBO</text>
</g>
```

#### 4.2 Draw Combination Shot Path
```javascript
function drawComboShot(combo) {
  const cuePos = ballPositions['cue'];
  const helperPos = ballPositions[combo.helperBallId];
  const targetPos = ballPositions[combo.targetBallId];
  const pocketPos = pocketCenters[selectedPocket];

  // Path 1: Cue → Helper ghost
  comboPath1.setAttribute('d', `M ${cuePos.x} ${cuePos.y} L ${combo.helperGhostPos.x} ${combo.helperGhostPos.y}`);

  // Path 2: Helper → Target
  comboPath2.setAttribute('d', `M ${helperPos.x} ${helperPos.y} L ${targetPos.x} ${targetPos.y}`);

  // Path 3: Target → Pocket
  comboPath3.setAttribute('d', `M ${targetPos.x} ${targetPos.y} L ${pocketPos.x} ${pocketPos.y}`);

  // Position combo ghost at helper ghost location
  comboGhost1.setAttribute('cx', combo.helperGhostPos.x);
  comboGhost1.setAttribute('cy', combo.helperGhostPos.y);

  comboShotIndicator.setAttribute('visibility', 'visible');
}
```

### Phase 5: Solver Integration

#### 5.1 Update Shot Solver Logic
```javascript
function findBestShot(cuePos, targetBallId, pocketPos, gameMode) {
  const results = {
    direct: null,
    kick: null,
    bank: null,
    combo: null
  };

  // 1. Try direct shot
  if (isDirectPathClear(cuePos, ghostPos, targetBallId)) {
    results.direct = calculateDirectShot(...);
  }

  // 2. If direct blocked, try kick
  if (!results.direct) {
    results.kick = findKickPath(...);
  }

  // 3. Try bank shot
  results.bank = findBankShots(...);

  // 4. If all above blocked or very difficult, try combo
  if (!results.direct && (!results.kick || !results.kick.viability.viable)) {
    results.combo = findCombinationShots(cuePos, targetBallId, pocketPos, gameMode);
  }

  // Return best option based on viability scores
  return selectBestShot(results, gameMode);
}
```

#### 5.2 Add "Prefer Combo" Solver Option
- Add to solver radio group: Auto | Prefer Kick | Prefer Bank | **Prefer Combo**
- When selected, always search for and display combo shots if available

### Phase 6: Shot Instructions Update

#### 6.1 Update Instructions for Combo Shots
```javascript
if (shotData.isComboShot) {
  aimText = `Hit ${combo.helperBallId}-ball into ${combo.targetBallId}-ball`;
  englishHintText = 'Two-ball combination';

  // Show both cut angles
  const totalDifficulty = combo.cutAngle1 + combo.cutAngle2;
  difficultyScore += totalDifficulty > 60 ? 40 : totalDifficulty > 30 ? 20 : 10;
}
```

#### 6.2 Game Mode Specific Warnings
- 8-Ball: "Must hit [solids/stripes] first"
- 9-Ball/10-Ball: "Must hit [N]-ball first"
- One Pocket: "Ball must go in [your pocket]"

### Phase 7: One Pocket Special Handling

#### 7.1 Pocket Assignment UI
- For One Pocket mode, show pocket selection UI
- Player picks bottom-left or bottom-right as their scoring pocket
- Other foot pocket belongs to opponent
- Side and head pockets are neutral (balls spotted)

#### 7.2 Visual Indicators
- Highlight player's pocket in green
- Highlight opponent's pocket in red
- Neutral pockets in gray
- Show warning if aiming at wrong pocket

---

## Implementation Order (Resumable Steps)

### Step 1: Game Mode Constants & State
- [ ] Add GAME_MODES constant object
- [ ] Add currentGameMode, playerSuit, playerPocket state variables
- [ ] Add findLowestBall() function

### Step 2: Game Mode UI
- [ ] Add game mode dropdown/selector HTML
- [ ] Add CSS styles for game mode selector
- [ ] Add event handler to change game mode
- [ ] Update UI to show current game mode

### Step 3: Legal Target Ball Logic
- [ ] Add getLegalTargetBalls() function
- [ ] Add visual highlighting for legal/illegal balls
- [ ] Add "Must hit X first" warning in Shot Instructions

### Step 4: Combination Shot Detection
- [ ] Add findCombinationShots() function
- [ ] Add isComboLegalForGameMode() validation
- [ ] Add combo scoring/ranking logic

### Step 5: Combination Shot Visualization
- [ ] Add combo-shot-indicator SVG group
- [ ] Add drawComboShot() function
- [ ] Add combo path styling (orange gradient)

### Step 6: Solver Integration
- [ ] Update findBestShot() to include combos
- [ ] Add "Prefer Combo" solver option
- [ ] Update auto-solver logic to consider combos when blocked

### Step 7: Shot Instructions for Combos
- [ ] Update updateShotInstructions() for combo shots
- [ ] Add combo-specific difficulty calculation
- [ ] Show "Hit X into Y" instruction format

### Step 8: One Pocket Mode
- [ ] Add pocket assignment UI for One Pocket
- [ ] Add pocket restriction logic
- [ ] Add visual indicators for scoring pockets

### Step 9: Testing & Polish
- [ ] Test each game mode
- [ ] Test combo detection with various layouts
- [ ] Add demo scenarios for each game mode
- [ ] Polish UI transitions

---

## Sources

- [APA 8-Ball Rules](https://www.unlv.edu/sites/default/files/page_files/27/CampusRec_BilliardsRules.pdf)
- [Pool Rules: 10 Different Pool Game Rules](https://pearsoncues.com/blog/pool-rules/)
- [Official BCA One Pocket Rules](https://www.billiards.com/blogs/articles/official-bca-one-pocket-rules)
- [One Pocket Rules - onepocket.org](https://www.onepocket.org/rules/)
- [Combination Shots - Basic Billiards](https://www.basicbilliards.com/pool-combinations.html)
- [Carom Shot Aiming - Dr. Dave Pool](https://drdavepoolinfo.com/faq/30-90-rules/carom/)
