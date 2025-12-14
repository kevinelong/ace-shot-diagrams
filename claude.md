# ACE Shot Diagrams

Pool table SVG template for creating interactive shot diagrams with physics-based shot solving.

## Project Structure

- `index.html` - Main interactive shot diagram application (all-in-one HTML/CSS/JS)
- `pool-table-template.svg` - Main SVG template (v008)
- `pool-table-labeled.svg` - Labeled version for reference
- `versions/` - Version history (v001-v008)
- `GAME_MODE_PLAN.md` - Implementation plan for game modes & combos
- `FEATURE_ROADMAP.md` - Feature roadmap with priorities and implementation details

## Pool Table SVG Layers

1. **layer-outer-frame** - Dark brown table edge
2. **layer-rails** - Wood grain pattern rails
3. **layer-pocket-voids** - Dark pocket holes
4. **layer-slate-cloth** - Tournament blue (#50a6c2) playing surface with scalloped pocket cutouts
5. **layer-cushions** - Rubber cushions with white edge highlight
6. **layer-diamonds** - Rail sights (mother-of-pearl style)
7. **layer-strings** - Reference lines (hidden by default)
8. **layer-spots** - Head, center, foot spots
9. **layer-grid** - Diamond-aligned reference grid
10. **layer-triangle** - Rack outline (hidden)
11. **layer-balls-object** - Object balls
12. **layer-ball-cue** - Cue ball
13. **layer-shot-paths** - Shot lines/arrows
14. **layer-annotations** - Labels/notes

## Dimensions

- 9-ft table: 100" x 50" playing surface
- viewBox: `-8 -8 116 66` (includes 8-unit rails)
- Scale: 1 unit = 1 inch
- Ball diameter: 2.25"
- Diamond spacing: 12.5"
- Ghost ball offset: 2.25 units (two ball radii)

## Features

### Interactive Elements
- Draggable balls: CUE, GHOST (aim), 1-15, generic gray
- Floating glassmorphism palettes (draggable, minimizable)
- Cue ball contact point selector (english/spin)
- Power slider (1-10)
- Clickable pocket selection
- Double-click/long-press to select balls

### Shot Types
1. **Direct Shot** - Clear path from cue to ghost ball
2. **Kick Shot** - Bounces off rail(s) when direct blocked (1-rail and 2-rail)
3. **Bank Shot** - Object ball bounces off rail to pocket
4. **Combination Shot** - Hit helper ball into target ball

### Game Modes
- **9-Ball**: Rotation (must hit lowest ball first)
- **8-Ball**: Suit-based (hit your solids/stripes first)
- **10-Ball**: Rotation with call pocket
- **Straight Pool**: Any ball, call pocket
- **One Pocket**: Any ball, designated pocket only scores

### Shot Solver
- Auto mode: Finds best available shot type
- Prefer Kick: Prioritizes kick shots
- Prefer Bank: Prioritizes bank shots
- Prefer Combo: Shows combination shots

### Visual Feedback
- Ghost ball indicator with crosshair and "AIM" label
- Kick shot diamond marker on rail aim point
- Bank shot diamond marker on rail contact point
- Mirror system aiming overlay for kick shots
- Combo shot paths: cyan→magenta→yellow-green
- Legal/illegal ball highlighting per game rules
- FOUL warning banner for illegal ball selection
- One Pocket scoring pocket glow (green=yours, red=opponent)

### Position Aids (Toggleable)
- **Tangent Line** (cyan) - Where CB goes with stop shot (90° from contact)
- **Follow Line** (green) - Where CB goes with top spin
- **Draw Line** (orange) - Where CB goes with back spin
- **Shape Zone** (green triangle) - Area where CB can be to make next shot

### Share & Export
- **Copy Link** - URL with encoded state (auto-updates as you edit)
- **Export PNG** - 1600x900 high-res image download
- **Export SVG** - 800x450 vector download
- **Random Rack** - Scatter balls randomly for practice
- **Save/Load Diagrams** - Named diagrams stored in localStorage

### Shot Analysis
- Cut angle display
- Shot make probability (%) with color coding
- Difficulty meter (easy/medium/hard/very-hard)
- Ball overlap fraction visualization

### First-Time User Tour
- 13-step guided walkthrough
- Spotlight highlighting with pulse animation
- Task suggestions for interactive learning
- Saved to localStorage after completion
- Accessible via "Take the Tour" button

### Physics
- Cut angle calculation using dot product
- Per-rail approach angle awareness for kick shots
- Energy transfer with coefficient of restitution (0.95)
- Ball friction: 0.2, Rail bounce: 0.85
- Throw calculation for spin transfer
- Cue ball path with draw/follow curve effect

## Usage

Open `index.html` in browser. Drag balls onto table, select pocket, adjust english and power. Shot Info panel shows aim point, difficulty, make %, and warnings.

### URL State Sharing
URLs auto-update with diagram state. Format:
```
#v1|cue:25.5,32.1|1:60,25|p:cbr|b:1|m:9ball|f:6|e:0.0,0.0|s:auto
```

### Running Tests
Open browser console and run:
```javascript
ACETests.runAll()
```

## Development Notes

### Critical Bugs Fixed
- Pocket elements use `data-pocket` attribute, NOT `id`
- Cut angle must be calculated PER-RAIL inside kick loop (not before)
- Shot info panel requires all shotData properties for both original and palette displays

### Color Accessibility
- Dark backgrounds (#1a1a2e) require light text (#9ab minimum)
- Similar-hue gradients hard to distinguish - use distinct hues
- Combo paths: cyan (#00ddff), magenta (#ff44ff), yellow-green (#aaff00)

### Code Patterns
```javascript
// Ball positions
ballPositions = { 'cue': {x, y}, 'ghost': {x, y}, '1': {x, y}, ... };

// Path blocking
isPathBlockedByAnyBall(start, end, excludeBallIds) // returns {blocked, blockingBalls}

// Game mode structure
GAME_MODES.NINE_BALL = {
  id: '9ball',
  targetRule: 'rotation',  // 'rotation' | 'suit' | 'any'
  comboMustHitLowestFirst: true
};

// State encoding for URL
encodeState(state) // returns compact string
decodeState(encoded) // returns state object

// Make probability
calculateMakeProbability(shotData) // returns 5-95%
```

### Key Functions
- `updateShotGeometry()` - Main calculation, calls updateShotInstructions
- `updateTangentLine()` - Position aid visualization
- `updateFollowDrawLines()` - Follow/draw line visualization
- `updateShapeZone()` - Shape zone polygon
- `updateMirrorSystemVisualization()` - Kick shot aiming overlay
- `scoreKickPath()` - Rates kick shots with cut angle penalties
- `exportPNG()`, `exportSVG()`, `copyShareLink()` - Export functions
- `saveDiagram(name)`, `loadDiagram(index)`, `deleteDiagram(index)` - Local storage ops
- `getSavedDiagrams()`, `renderSavedList()` - Saved diagrams management

### Floating Palettes
- `#palette-balls` - Ball rack (top-left)
- `#palette-cue` - Cue control with english diagram (bottom-left)
- `#palette-game` - Game mode and solver (top area)
- `#palette-shot` - Shot info display (bottom-right)
- `#palette-share` - Share, export, position aids (top-right)

## TODO

- [x] ~~Export as PNG/SVG~~ (Implemented)
- [x] ~~URL state sharing~~ (Implemented)
- [x] ~~Position aids (tangent, follow, draw, shape zone)~~ (Implemented)
- [x] ~~Shot make probability~~ (Implemented)
- [x] ~~Random rack button~~ (Implemented)
- [x] ~~First-time user tour~~ (Implemented)
- [x] ~~Test suite~~ (Implemented)
- [x] ~~Local storage save/load named diagrams~~ (Implemented)
- [ ] Safety shot mode (snooker zones, defensive positions)
- [ ] Multi-shot sequences (run-out planning)
- [x] ~~Mobile responsiveness (@media queries)~~ (Implemented)
- [ ] ARIA labels for accessibility
