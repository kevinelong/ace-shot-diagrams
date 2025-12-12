# Playwright UX Test Plan - ACE Shot Diagrams

## Overview
Comprehensive user-oriented visual tests focusing on **user intent and experience**, not just code execution. Every feature must be tested from the perspective of: "What is the user trying to accomplish?" and "Does the UI clearly communicate what's happening?"

---

## Testing Philosophy

### Core Principles
1. **User Intent First**: Test what users are trying to do, not just what the code does
2. **Visual Feedback**: Verify that every action provides clear visual feedback
3. **Error Prevention**: Test that the UI prevents mistakes and guides users
4. **Accessibility**: Ensure all features are discoverable and usable
5. **Performance**: Verify instant feedback and smooth interactions
6. **Cross-browser**: Test in Chromium, Firefox, and WebKit

### Test Categories
- 🎯 **Critical Path**: Core user workflows (must never break)
- ✨ **Feature Tests**: Individual feature verification
- 🎨 **Visual Tests**: Screenshot comparisons and visual feedback
- 🚨 **Error Handling**: Edge cases and error states
- ♿ **Accessibility**: Keyboard navigation, ARIA labels, screen reader support

---

## Feature Inventory & Test Requirements

### 1. Ball Placement & Management 🎯
**User Intent**: "I want to set up a specific pool shot scenario"

#### Tests Required:
- [ ] **Drag ball from palette to table**
  - Visual feedback: Ball follows cursor smoothly
  - Ghost preview shows where ball will land
  - Ball snaps to valid position on release
  - Invalid positions are rejected (off-table, overlapping)
  
- [ ] **Move existing ball on table**
  - Ball can be dragged to new position
  - Other balls update if affected by collision
  - Visual feedback during drag
  
- [ ] **Double-click/long-press to select object ball**
  - Clear visual indicator (highlight, glow, or ring)
  - Previous selection is cleared
  - Ghost ball appears if pocket is selected
  
- [ ] **Remove ball from table**
  - Drag ball off table or back to palette
  - Ball disappears with smooth animation
  - Shot recalculates without this ball
  
- [ ] **Cue ball special handling**
  - Cue ball (white) always available
  - Can be repositioned anywhere
  - Only one cue ball can exist at a time
  
- [ ] **Ball collision detection**
  - Cannot place balls overlapping
  - Visual rejection feedback
  - Balls push each other slightly if too close

**Visual Tests**:
- Screenshot: Empty table
- Screenshot: Table with all 15 balls placed
- Screenshot: Ball being dragged (ghost preview visible)
- Screenshot: Object ball selected (with highlight)

---

### 2. Pocket Selection & Targeting 🎯
**User Intent**: "I want to specify which pocket I'm shooting for"

#### Tests Required:
- [ ] **Click pocket to select target**
  - Pocket highlights clearly (border, glow, color change)
  - Previous pocket selection clears
  - Ghost ball appears at calculated position
  
- [ ] **Pocket visual feedback states**
  - Default state (subtle, available)
  - Hover state (highlighted)
  - Selected state (strong visual indicator)
  - Game mode restrictions (some pockets disabled in One Pocket)
  
- [ ] **Corner vs side pocket selection**
  - All 6 pockets selectable
  - Correct pocket geometry used in calculations
  
- [ ] **Clear pocket selection**
  - Click away from table to deselect
  - Visual indicators all clear

**Visual Tests**:
- Screenshot: No pocket selected
- Screenshot: Each pocket selected (6 tests)
- Screenshot: Pocket hover state
- Screenshot: One Pocket mode (restricted pockets grayed out)

---

### 3. Shot Calculation & Visualization 🎯
**User Intent**: "I want to see how to make this shot and understand the physics"

#### Tests Required:
- [ ] **Ghost ball positioning**
  - Ghost ball appears at correct position
  - Shows where cue ball must contact object ball
  - AIM indicator visible and aligned
  
- [ ] **Target line (pocket to object ball)**
  - Red dashed line from object ball to pocket
  - Correctly calculated angle
  
- [ ] **Cue ball path line**
  - Blue line from cue ball to ghost ball
  - Shows direct or kick path
  - Accounts for english/spin
  
- [ ] **Object ball path**
  - Yellow/gold line from object ball to pocket
  - Shows predicted travel path
  
- [ ] **Final position indicators**
  - CB final position marker appears
  - OB final position marker (if doesn't pocket)
  - Clear visual distinction (icons, colors)
  
- [ ] **Contact point marker**
  - Small circle at contact point
  - Accurately positioned
  
- [ ] **Cut angle calculation**
  - Displayed in degrees
  - Updates in real-time
  - Visible in Shot Info panel

**Visual Tests**:
- Screenshot: Simple straight shot (0° cut)
- Screenshot: 30° cut angle shot
- Screenshot: 60° cut angle shot
- Screenshot: Full cut shot (80°+)
- Screenshot: All visual indicators labeled

---

### 4. Shot Types & Solvers ✨
**User Intent**: "I want to understand different ways to make this shot"

#### 4A. Direct Shots
- [ ] **Straight-in shot detection**
  - Ghost ball, target line, cue path all aligned
  - No obstruction warnings
  
- [ ] **Cut shot calculation**
  - Correct ghost ball positioning for angles
  - Cut angle displayed accurately
  - Overlap percentage shown
  
- [ ] **Blocked direct shot detection**
  - Warning banner if ball is in the way
  - Suggestion to try kick shot

#### 4B. Kick Shots (1-Rail)
- [ ] **Enable kick solver mode**
  - Radio button or toggle in palette
  - UI updates to show kick mode active
  
- [ ] **Calculate 1-rail kick path**
  - Kick aim indicator appears on rail
  - Dashed path from CB to rail point
  - Solid path from rail to object ball
  - Angle of incidence = angle of reflection
  
- [ ] **Mirror system overlay**
  - Mirror ghost ball appears (reflected position)
  - Mirror aim line visible
  - Midpoint marker on rail
  
- [ ] **Incoming/outgoing angle arcs**
  - Visual arcs showing angles
  - Angle measurements displayed
  
- [ ] **English effect indicator**
  - Shows how english will modify kick angle
  - Running/reverse english visualization

#### 4C. Kick Shots (2-Rail)
- [ ] **2-rail kick calculation**
  - Two kick points calculated
  - Path shows CB → rail1 → rail2 → OB
  - Both rail contact points marked
  
- [ ] **Path difficulty indication**
  - Higher difficulty score for 2-rail
  - Visual feedback (color coding)

#### 4D. Bank Shots
- [ ] **Bank shot detection**
  - Detects when OB will hit rail before pocket
  - Bank point indicator on rail
  - Bank point label visible
  
- [ ] **Bank angle visualization**
  - Path from OB to bank point
  - Path from bank point to pocket
  - Angle indicators

#### 4E. Combination Shots
- [ ] **Combo shot detection**
  - Detects helper ball between CB and target
  - Shows 2-ball combination is possible
  
- [ ] **Combo path visualization**
  - Path 1: CB to first ball
  - Path 2: First ball to second ball (contact)
  - Path 3: Second ball to pocket
  - Combo helper ghost ball
  
- [ ] **Combo label and indicators**
  - "COMBO" label appears
  - All three balls clearly marked
  - Difficulty score reflects combo complexity

**Visual Tests**:
- Screenshot: Direct straight shot
- Screenshot: 45° cut shot
- Screenshot: 1-rail kick shot with mirror system
- Screenshot: 2-rail kick shot
- Screenshot: Bank shot
- Screenshot: 2-ball combination shot

---

### 5. English/Spin Controls ✨
**User Intent**: "I want to control cue ball spin for position play"

#### Tests Required:
- [ ] **English selector interactive diagram**
  - 3x3 grid of click points on cue ball diagram
  - Current selection highlighted
  - Preview shows where tip will strike
  
- [ ] **English positions**
  - Center ball (no spin)
  - Top spin (follow)
  - Bottom spin (draw)
  - Left english
  - Right english
  - Combinations (top-left, top-right, etc.)
  
- [ ] **Visual feedback on selection**
  - Selected position highlights
  - Spin type text updates ("Center", "Follow", "Draw", "Right English")
  - Icon or color indicates spin type
  
- [ ] **English effect on shot path**
  - Cue ball path curves appropriately
  - Kick shots show angle modification
  - Final position changes with english

**Visual Tests**:
- Screenshot: Center ball (no spin)
- Screenshot: Top spin selected
- Screenshot: Bottom spin selected
- Screenshot: Right english selected
- Screenshot: Path changes with different english

---

### 6. Power Control ✨
**User Intent**: "I want to control how hard I hit the ball"

#### Tests Required:
- [ ] **Power slider interaction**
  - Slider moves smoothly
  - Value updates in real-time (0-100%)
  - Visual feedback on slider
  
- [ ] **Power effect on paths**
  - Longer paths at higher power
  - Final positions change appropriately
  - Roll distance increases
  
- [ ] **Power needed indicator**
  - Displays minimum power for shot
  - Shows if current power is sufficient
  - Color coding (green=good, yellow=low, red=too low)
  
- [ ] **Power status feedback**
  - "Sufficient", "Too soft", "Perfect", etc.
  - Updates as slider changes

**Visual Tests**:
- Screenshot: 25% power shot
- Screenshot: 50% power shot
- Screenshot: 100% power shot
- Screenshot: Power insufficient warning

---

### 7. Game Modes & Rules 🎯
**User Intent**: "I want to practice shots for a specific game"

#### Tests Required:
- [ ] **Game mode selection dropdown**
  - All 5 modes listed: 9-Ball, 8-Ball, 10-Ball, Straight Pool, One Pocket
  - Current mode clearly indicated
  - Description updates on selection
  
- [ ] **Game mode descriptions**
  - Clear explanation of rules
  - Target ball rules explained
  - Pocket rules explained

#### 7A. 9-Ball Mode
- [ ] **Lowest ball detection**
  - System identifies lowest numbered ball on table
  - Must hit this ball first (or foul)
  
- [ ] **Legal shot validation**
  - Warning if trying to hit wrong ball first
  - Combination shots allowed if lowest ball hit first
  
- [ ] **Any pocket counts**
  - All pockets available for scoring

#### 7B. 8-Ball Mode
- [ ] **Suit selection**
  - Radio buttons: Solids, Stripes
  - Player chooses their suit
  
- [ ] **Legal target balls**
  - Only player's suit balls are valid targets
  - 8-ball becomes target after suit cleared
  
- [ ] **Call pocket requirement**
  - Must specify pocket before shot

#### 7C. 10-Ball Mode
- [ ] **Similar to 9-ball but with 10 balls**
- [ ] **Call pocket requirement**

#### 7D. Straight Pool
- [ ] **Any ball is legal**
  - No rotation or suit restrictions
  
- [ ] **Call shot requirement**
  - Must call ball and pocket

#### 7E. One Pocket
- [ ] **Pocket assignment**
  - Player selects one corner pocket
  - Only that pocket scores
  
- [ ] **Other pockets visual state**
  - Non-scoring pockets grayed out or marked
  - Clear indication which is player's pocket

**Visual Tests**:
- Screenshot: 9-Ball mode selected (with description)
- Screenshot: 8-Ball mode with suit selector
- Screenshot: One Pocket mode with pocket restriction
- Screenshot: Foul warning for illegal shot

---

### 8. Position Play Aids ✨
**User Intent**: "I want to plan where the cue ball will end up for my next shot"

#### Tests Required:
- [ ] **Tangent line toggle**
  - Button to show/hide tangent line
  - 90° line from contact point
  - Shows natural stop-shot position
  
- [ ] **Follow line (natural roll)**
  - Shows CB path with follow/top spin
  - ~30° deflection from tangent
  
- [ ] **Draw line (backspin)**
  - Shows CB path with draw/bottom spin
  - Opposite direction from follow
  
- [ ] **Shape zone visualization**
  - Triangular zone showing acceptable CB positions
  - For making next ball in sequence
  - Color-coded (green=easy, yellow=harder, red=difficult)
  
- [ ] **Position aids toggle on/off**
  - Can hide/show all aids
  - Individual control for each aid type
  
- [ ] **Visual clarity**
  - Different colors for each line type
  - Clear labels
  - Non-intrusive but visible

**Visual Tests**:
- Screenshot: Tangent line only
- Screenshot: Tangent + follow + draw lines
- Screenshot: Shape zone for next ball
- Screenshot: All position aids combined

---

### 9. Shot Analysis & Info Panel 🎯
**User Intent**: "I want to understand how difficult this shot is and how to execute it"

#### Tests Required:
- [ ] **Shot verdict display**
  - "MAKEABLE", "DIFFICULT", "RISKY", etc.
  - Clear language, not technical
  
- [ ] **Aim instruction**
  - "Aim at ghost ball position"
  - "Hit rail at diamond marker"
  - Simple, actionable language
  
- [ ] **English instruction**
  - What spin to use
  - Why that spin is recommended
  
- [ ] **English hint**
  - Additional tips
  - "Use running english to widen angle"
  
- [ ] **Power recommendation**
  - "Medium stroke", "Soft hit", "Firm stroke"
  - Not just percentage
  
- [ ] **Difficulty rating**
  - Visual meter (bar, gauge, etc.)
  - 0-100 scale or star rating
  - Color coded
  
- [ ] **Difficulty text**
  - "Easy", "Medium", "Hard", "Expert"
  - Percentage or probability
  
- [ ] **Make probability**
  - "78% make rate" (converts difficulty score)
  - More intuitive than raw score

**Visual Tests**:
- Screenshot: Easy shot analysis
- Screenshot: Medium difficulty shot
- Screenshot: Expert level shot
- Screenshot: Complete Shot Info panel

---

### 10. Export Features ✨
**User Intent**: "I want to share this shot diagram with others"

#### 10A. PNG Export
- [ ] **Export to PNG button**
  - Clear button label
  - In actions palette or menu
  
- [ ] **PNG generation**
  - 1600x900 resolution
  - Captures table and all visual elements
  - Downloads automatically
  - Filename includes timestamp
  
- [ ] **PNG quality verification**
  - All lines visible
  - Text readable
  - Colors accurate
  - No UI elements (palettes hidden)

#### 10B. SVG Export
- [ ] **Export to SVG button**
  - Separate from PNG export
  
- [ ] **SVG generation**
  - 800x450 base size
  - Vector format (scalable)
  - Clean SVG structure
  - Preserves all visual elements
  
- [ ] **SVG can be opened in editors**
  - Valid SVG format
  - Editable in Inkscape, Illustrator, etc.

#### 10C. URL Sharing
- [ ] **Generate shareable URL**
  - "Copy Link" button
  - Encodes all state in URL hash
  
- [ ] **URL state encoding**
  - Ball positions (all balls)
  - Selected object ball
  - Selected pocket
  - English settings
  - Power level
  - Game mode
  - Solver mode
  - Position aids state
  
- [ ] **URL sharing workflow**
  - Click "Copy Link"
  - URL copied to clipboard
  - Confirmation message appears
  - Link can be pasted and shared
  
- [ ] **URL loading**
  - Open URL with state hash
  - All state restores correctly
  - Visual elements render immediately
  - No errors on load

**Visual Tests**:
- Screenshot: Export panel/menu
- Verify exported PNG file
- Verify exported SVG file
- Test URL with encoded state

---

### 11. Save/Load Diagrams ✨
**User Intent**: "I want to save my work and return to it later"

#### Tests Required:
- [ ] **Save diagram button**
  - Accessible from actions palette
  - Opens save dialog
  
- [ ] **Name diagram**
  - Text input field
  - Default name suggested (timestamp or "Diagram 1")
  - Name validation (no empty names)
  
- [ ] **Save to localStorage**
  - Diagram saved with name
  - All state persisted (same as URL export)
  - Confirmation message
  
- [ ] **List saved diagrams**
  - Show all saved diagrams by name
  - Display save date/time
  - Thumbnail preview (optional but nice)
  
- [ ] **Load diagram**
  - Click diagram name to load
  - Confirmation if current work unsaved
  - State restores completely
  - Visual elements update
  
- [ ] **Delete saved diagram**
  - Delete button per diagram
  - Confirmation dialog
  - Diagram removed from list
  
- [ ] **Overwrite existing diagram**
  - Save with existing name
  - Confirmation prompt
  - Updates saved state

**Visual Tests**:
- Screenshot: Save dialog with name input
- Screenshot: List of saved diagrams
- Screenshot: Load confirmation dialog
- Screenshot: Successfully loaded diagram

---

### 12. Floating Palettes & UI 🎯
**User Intent**: "I want to organize my workspace and access tools easily"

#### Tests Required:
- [ ] **All palettes visible on load**
  - Ball Rack palette (top-left)
  - Cue Control palette (bottom-left)
  - Legend palette (left-center)
  - Game Mode palette (top-right)
  - Shot Info palette (bottom-right)
  - Position Aids palette (right-center)
  - Quick Actions palette (top-center)
  - Save/Load palette (bottom-center)
  
- [ ] **Drag palette to reposition**
  - Click and hold palette header
  - Drag to new position
  - Smooth movement
  - Cursor changes (grabbing)
  - Palette follows cursor precisely
  - Drops at mouse release
  
- [ ] **Minimize palette**
  - Click minimize button (−)
  - Body collapses, header remains
  - Smooth animation
  - Click again to restore
  
- [ ] **Close/hide palette**
  - Click close button (×)
  - Palette disappears
  - Can be restored from menu
  
- [ ] **Restore hidden palette**
  - "Restore" button for each palette
  - Palette reappears at last position
  - State preserved (minimized or expanded)
  
- [ ] **Palette hover effects**
  - Slight shadow increase on hover
  - Opacity changes
  - Smooth transition
  
- [ ] **Palette z-index management**
  - Dragged palette comes to front
  - Overlapping palettes handle correctly
  
- [ ] **Palette glassmorphism style**
  - Background blur effect
  - Semi-transparent background
  - Subtle border
  - Modern aesthetic

**Visual Tests**:
- Screenshot: All palettes in default positions
- Screenshot: Palettes rearranged
- Screenshot: Some palettes minimized
- Screenshot: Palette hover state
- Screenshot: Dragging a palette

---

### 13. Guided Tour System ✨
**User Intent**: "I'm a new user and want to learn how to use this tool"

#### Tests Required:
- [ ] **Tour triggers on first visit**
  - Detects localStorage flag
  - Starts automatically for new users
  - Can be dismissed
  
- [ ] **Tour overlay appears**
  - Dark overlay behind tour
  - Current step highlighted
  - Other UI dimmed
  
- [ ] **Tour step progression**
  - Step 1: Welcome and overview
  - Step 2: Ball placement
  - Step 3: Pocket selection
  - Step 4: Shot calculation
  - Step 5: English controls
  - Step 6: Game modes
  - Step 7: Export/save
  - Final: Tour complete
  
- [ ] **Each tour step**
  - Title clear and descriptive
  - Explanation in plain language
  - Visual indicator (arrow, highlight, spotlight)
  - "Next" button
  - "Skip Tour" button
  - Step counter (e.g., "3 of 7")
  
- [ ] **Interactive tour steps**
  - Some steps require user action
  - "Try dragging a ball to the table"
  - Tour waits for action completion
  - Encouragement message on success
  
- [ ] **Tour navigation**
  - "Previous" button (after step 1)
  - "Next" button
  - "Skip Tour" always available
  - Keyboard navigation (arrow keys, escape)
  
- [ ] **Tour completion**
  - Congratulations message
  - "Start Diagramming" button
  - localStorage flag set (tour completed)
  - Tour won't show again unless cleared
  
- [ ] **Restart tour option**
  - Help menu or settings
  - "Restart Tour" button
  - Clears localStorage flag
  - Tour starts from beginning

**Visual Tests**:
- Screenshot: Tour step 1 (welcome)
- Screenshot: Tour step with highlight/spotlight
- Screenshot: Tour completion screen
- Screenshot: Tour navigation buttons

---

### 14. Error Handling & Edge Cases 🚨
**User Intent**: "I want clear feedback when something goes wrong or I make a mistake"

#### Tests Required:
- [ ] **No cue ball on table**
  - Warning message: "Place a cue ball to start"
  - Ball palette highlights cue ball
  - Cannot select object ball without cue ball
  
- [ ] **No object ball selected**
  - Status banner: "Select a ball to shoot at"
  - Instructions clear
  
- [ ] **No pocket selected**
  - Status banner: "Click a pocket to aim at"
  - Pockets subtly pulse or highlight
  
- [ ] **Illegal shot warning (game rules)**
  - Foul warning banner appears
  - Explains why shot is illegal
  - Suggestion for legal alternative
  
- [ ] **Blocked shot (no solution)**
  - "No clear path found" message
  - Suggestions: "Try kick shot" or "Try combination"
  
- [ ] **Impossible shot**
  - "Shot not possible from this position"
  - Difficulty rating: "Impossible"
  - Suggests repositioning balls
  
- [ ] **Ball placement conflicts**
  - Cannot place ball on top of another ball
  - Visual rejection (ball snaps back)
  - Brief error message
  
- [ ] **Invalid export state**
  - Nothing to export (no balls on table)
  - Warning message
  - Export disabled or grayed out
  
- [ ] **localStorage quota exceeded**
  - "Storage full" message
  - Suggests deleting old diagrams
  - Graceful degradation
  
- [ ] **Invalid URL hash**
  - Corrupted or invalid state in URL
  - Error message: "Could not load shared diagram"
  - Defaults to clean state
  - Doesn't crash app

**Visual Tests**:
- Screenshot: Each error/warning state
- Screenshot: Foul warning banner
- Screenshot: Status messages

---

### 15. Accessibility & Keyboard Navigation ♿
**User Intent**: "I want to use this app with keyboard only or screen reader"

#### Tests Required:
- [ ] **Tab navigation**
  - All interactive elements focusable
  - Logical tab order
  - Focus indicator visible
  
- [ ] **Keyboard shortcuts**
  - Escape: Close dialogs/tour
  - Arrow keys: Navigate tour steps
  - Enter: Activate focused button
  - Space: Toggle checkboxes
  
- [ ] **ARIA labels**
  - All buttons have aria-label
  - Palettes have role and label
  - Ball elements described
  - Pocket targets labeled
  
- [ ] **Screen reader compatibility**
  - Shot info readable by screen reader
  - State changes announced
  - Error messages announced
  
- [ ] **Focus management**
  - Focus trapped in modal dialogs
  - Focus returns after closing dialog
  - Focus visible on all controls
  
- [ ] **Color contrast**
  - Text meets WCAG AA standards
  - Visual indicators don't rely on color alone
  - High contrast mode support

---

### 16. Performance & Responsiveness ✨
**User Intent**: "I expect smooth, instant feedback"

#### Tests Required:
- [ ] **Initial load time**
  - Page loads in < 1 second
  - SVG renders immediately
  - No blocking scripts
  
- [ ] **Drag performance**
  - 60fps during ball dragging
  - No jank or stuttering
  - Smooth cursor tracking
  
- [ ] **Shot calculation speed**
  - Recalculates in < 100ms
  - Visual updates immediate
  - No perceptible lag
  
- [ ] **Palette drag performance**
  - Smooth palette movement
  - No repaints of other elements
  - Efficient CSS transforms
  
- [ ] **Memory usage**
  - No memory leaks during extended use
  - localStorage doesn't grow unbounded
  - Images released after export

---

### 17. Visual Regression Tests 🎨
**User Intent**: "The app should look consistent across updates"

#### Tests Required:
- [ ] **Baseline screenshots for all states**
  - Empty table
  - Table with various ball configurations
  - Each shot type visualization
  - Each game mode
  - All palettes in various positions
  - Tour steps
  - Error states
  
- [ ] **Compare against baseline**
  - Pixel-perfect comparison
  - Highlight differences
  - Fail test if significant change
  
- [ ] **Multi-viewport testing**
  - Desktop (1920x1080)
  - Laptop (1366x768)
  - Tablet landscape (1024x768)
  - Mobile landscape (if applicable)

---

## Test Organization Structure

```
tests/
├── setup/
│   ├── playwright.config.ts         # Playwright configuration
│   ├── test-helpers.ts               # Shared utilities
│   └── fixtures.ts                   # Test fixtures and data
│
├── critical-path/
│   ├── 01-ball-placement.spec.ts     # Basic drag and drop
│   ├── 02-pocket-selection.spec.ts   # Target selection
│   ├── 03-shot-calculation.spec.ts   # Core shot solving
│   └── 04-export-share.spec.ts       # Export functionality
│
├── features/
│   ├── english-controls.spec.ts      # Spin selection
│   ├── power-control.spec.ts         # Power slider
│   ├── shot-types/
│   │   ├── direct-shots.spec.ts
│   │   ├── kick-shots.spec.ts
│   │   ├── bank-shots.spec.ts
│   │   └── combo-shots.spec.ts
│   ├── game-modes/
│   │   ├── nine-ball.spec.ts
│   │   ├── eight-ball.spec.ts
│   │   ├── ten-ball.spec.ts
│   │   ├── straight-pool.spec.ts
│   │   └── one-pocket.spec.ts
│   ├── position-aids.spec.ts         # Tangent lines, shape zones
│   ├── save-load.spec.ts             # localStorage persistence
│   └── url-sharing.spec.ts           # State encoding/decoding
│
├── ui/
│   ├── floating-palettes.spec.ts     # Drag, minimize, close
│   ├── guided-tour.spec.ts           # Tour system
│   └── keyboard-navigation.spec.ts   # Accessibility
│
├── errors/
│   ├── validation-errors.spec.ts     # Input validation
│   ├── game-rule-fouls.spec.ts       # Illegal shots
│   └── edge-cases.spec.ts            # Unusual scenarios
│
├── visual/
│   ├── shot-visualizations.spec.ts   # Screenshot tests
│   ├── ui-states.spec.ts             # All UI states
│   └── cross-browser.spec.ts         # Browser consistency
│
└── performance/
    ├── load-time.spec.ts             # Initial load
    ├── drag-performance.spec.ts      # Interaction smoothness
    └── calculation-speed.spec.ts     # Shot solving performance
```

---

## Test Utilities & Helpers

### Helper Functions Needed
```typescript
// Ball placement helpers
async function dragBallToTable(page, ballNumber, x, y)
async function moveBallOnTable(page, ballNumber, newX, newY)
async function selectObjectBall(page, ballNumber)
async function getBallPosition(page, ballNumber)

// Pocket helpers
async function selectPocket(page, pocketId)
async function getSelectedPocket(page)

// Shot analysis helpers
async function getGhostBallPosition(page)
async function getCutAngle(page)
async function getDifficultyScore(page)
async function getMakeProbability(page)

// English helpers
async function setEnglish(page, x, y) // -1 to 1 for each
async function getEnglishSetting(page)
async function setPower(page, percentage)

// Game mode helpers
async function setGameMode(page, mode)
async function setSuit(page, suit) // for 8-ball
async function setPlayerPocket(page, pocketId) // for one-pocket

// Visual verification
async function waitForShotCalculation(page)
async function verifyGhostBallVisible(page)
async function verifyTargetLineVisible(page)
async function verifyCueBallPathVisible(page)

// State helpers
async function getFullState(page) // Get all state for verification
async function loadStateFromURL(page, url)
async function exportToPNG(page)
async function exportToSVG(page)

// Palette helpers
async function dragPalette(page, paletteId, x, y)
async function minimizePalette(page, paletteId)
async function closePalette(page, paletteId)
async function restorePalette(page, paletteId)

// Tour helpers
async function startTour(page)
async function advanceTourStep(page)
async function completeTour(page)
async function skipTour(page)

// Error verification
async function expectErrorMessage(page, message)
async function expectFoulWarning(page)
async function expectStatusBanner(page, message)
```

### Fixtures
```typescript
// Common ball configurations
const STRAIGHT_IN_SHOT = {
  cueBall: { x: 200, y: 450 },
  objectBall: { ballNumber: 1, x: 400, y: 450 },
  pocket: 'top-right'
};

const ANGLE_CUT_SHOT = {
  cueBall: { x: 200, y: 600 },
  objectBall: { ballNumber: 5, x: 500, y: 450 },
  pocket: 'top-right'
};

const KICK_SHOT_SETUP = {
  cueBall: { x: 300, y: 700 },
  objectBall: { ballNumber: 9, x: 500, y: 300 },
  blockingBall: { ballNumber: 3, x: 400, y: 500 },
  pocket: 'top-left'
};

const COMBO_SHOT_SETUP = {
  cueBall: { x: 200, y: 600 },
  helperBall: { ballNumber: 2, x: 400, y: 500 },
  targetBall: { ballNumber: 9, x: 550, y: 350 },
  pocket: 'top-right'
};

const NINE_BALL_RACK = {
  // Standard 9-ball diamond rack positions
  // ... (calculate positions)
};
```

---

## Prioritized Test Implementation Order

### Phase 1: Critical Path (Week 1)
1. Ball placement and drag-drop
2. Pocket selection
3. Basic shot calculation (direct shots)
4. Export to PNG

### Phase 2: Core Features (Week 2)
5. English controls
6. Power slider
7. Kick shots (1-rail)
8. Save/load functionality

### Phase 3: Advanced Features (Week 3)
9. All shot types (bank, combo, 2-rail)
10. Game modes (all 5)
11. Position aids
12. URL sharing

### Phase 4: UI & Polish (Week 4)
13. Floating palettes (drag, minimize, close)
14. Guided tour
15. Error handling
16. Keyboard navigation

### Phase 5: Visual & Performance (Week 5)
17. Visual regression tests
18. Performance benchmarks
19. Cross-browser testing
20. Mobile responsiveness (if applicable)

---

## Success Metrics

### Coverage Goals
- [ ] 100% of critical paths tested
- [ ] 95%+ of features covered
- [ ] All user-facing error states verified
- [ ] Visual regression baselines for all views

### Quality Standards
- [ ] All tests pass on Chrome, Firefox, Safari
- [ ] No flaky tests (>99% pass rate)
- [ ] Tests run in < 5 minutes total
- [ ] Clear failure messages for debugging

### Documentation
- [ ] Every test has clear description
- [ ] README with test run instructions
- [ ] CI/CD integration documented
- [ ] Contribution guidelines for new tests

---

## Running Tests

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run specific test suite
npm test -- critical-path/
npm test -- features/shot-types/

# Run with UI (headed mode)
npm test -- --headed

# Run in specific browser
npm test -- --project=firefox

# Update visual baselines
npm test -- --update-snapshots

# Run in debug mode
npm test -- --debug

# Generate test report
npm test -- --reporter=html
```

---

## Continuous Integration

### CI Pipeline
1. Trigger on: Pull request, push to main
2. Parallel test execution across browsers
3. Visual regression comparison
4. Performance benchmarks
5. Generate and publish test report
6. Fail PR if any test fails

### Environments
- Local development (npm test)
- CI server (GitHub Actions / Azure DevOps)
- Pre-production (staging URL)
- Production (smoke tests only)

---

## Maintenance Plan

### Regular Updates
- Review tests quarterly
- Update baselines for intentional visual changes
- Add tests for new features before merging
- Refactor tests when code structure changes

### Test Health
- Monitor flaky tests (rerun 3x before marking flaky)
- Fix or quarantine consistently flaky tests
- Keep test runtime under 5 minutes
- Remove obsolete tests

---

## Notes & Considerations

1. **Zero Dependencies**: App is a single HTML file, so tests must handle this
2. **localStorage**: Clear between tests to ensure clean state
3. **Visual Elements**: Many SVG elements require special handling
4. **Physics Calculations**: Some calculations may have floating-point precision issues
5. **Animation Timing**: Wait for animations to complete before assertions
6. **Random Elements**: If any randomization exists, seed it for tests
7. **Performance**: Physics calculations should complete quickly for smooth UX
8. **Browser Differences**: SVG rendering may differ slightly between browsers

---

**END OF TEST PLAN**

This plan prioritizes user intent and experience over code coverage. Every test asks: "What is the user trying to do?" and "Does the UI clearly support that goal?"
