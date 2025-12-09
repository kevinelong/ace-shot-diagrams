# ACE Shot Diagrams

Pool table SVG template for creating interactive shot diagrams with physics-based shot solving.

## Project Structure

- `index.html` - Main interactive shot diagram application
- `pool-table-template.svg` - Main SVG template (v008)
- `pool-table-labeled.svg` - Labeled version for reference
- `versions/` - Version history (v001-v008)
- `GAME_MODE_PLAN.md` - Implementation plan for game modes & combos

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

## index.html Features (2024-12-08)

### Interactive Elements
- Draggable balls: CUE, GHOST (aim), 1-15, generic gray
- Ball rack below table, centered
- Cue ball contact point selector (english/spin)
- Power slider (1-10)
- Clickable pocket selection

### Shot Types
1. **Direct Shot** - Clear path from cue to ghost ball
2. **Kick Shot** - Bounces off rail(s) when direct blocked
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
- Combo shot paths: cyan→magenta→yellow-green
- Legal/illegal ball highlighting per game rules
- FOUL warning banner for illegal ball selection
- One Pocket scoring pocket glow (green=yours, red=opponent)

### Physics
- Cut angle calculation using dot product
- Energy transfer with coefficient of restitution (0.95)
- Ball friction: 0.2, Rail bounce: 0.85
- Throw calculation for spin transfer
- Cue ball path with draw/follow curve effect

## Usage

Open `index.html` in browser. Drag balls onto table, select pocket, adjust english and power. Shot Instructions panel shows aim point, difficulty, and warnings.

## Development Notes

### Critical Bug Fixed
- Pocket elements use `data-pocket` attribute, NOT `id`
- Must use `pocket.dataset.pocket` not `pocket.id`

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
```

## TODO

- [ ] Improve legal ball highlighting (more contrast)
- [ ] Add mobile responsiveness (@media queries)
- [ ] Add ARIA labels for accessibility
- [ ] Save/load diagram configurations
- [ ] Export as PNG/PDF
