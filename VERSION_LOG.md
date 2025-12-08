# ACE Shot Diagrams - Version Log

## Versioning System
- All versions saved in `/versions/` folder
- Format: `pool-table-v###.svg`
- Never delete previous versions

---

## v001 - Initial Template (2025-12-07)
**File:** `versions/pool-table-v001.svg`

### Features:
- 14-layer componentized structure
- 9-ft regulation table dimensions (100" x 50")
- Basic table anatomy:
  - Outer frame (dark wood)
  - Rails with wood grain pattern
  - 6 pockets (4 corner, 2 side)
  - Cushions (green, matching cloth)
  - Playing surface (green cloth)
  - 18 diamond sights
  - Head/Foot/Center spots
  - Reference strings (dashed lines)
  - 4x8 chalk-like grid
  - Triangle outline (hidden by default)
- Definitions for:
  - Wood grain pattern
  - Cloth texture
  - Arrow markers
  - Ball templates
  - Shadow filters
  - Gradients

### Known Issues:
- Grid lines need alignment refinement
- Diamond positions need verification
- Pockets need better shaping
- Cushion geometry simplified

### Next Steps:
- Refine pocket shapes and shadows
- Verify diamond spacing accuracy
- Improve cushion nose profiles
- Add ball components
- Test with example shots

---

## v002 - Corrected Orientation & Positions (2025-12-07)
**File:** `versions/pool-table-v002.svg`

### Major Fixes:
- **SIDE POCKETS**: Moved from left/right (wrong) to top/bottom at x=50 (correct)
- **HEAD SPOT**: Moved from (50, 12.5) to (25, 25)
- **FOOT SPOT**: Moved from (50, 37.5) to (75, 25)
- **HEAD STRING**: Changed from horizontal to VERTICAL at x=25
- **FOOT STRING**: Changed from horizontal to VERTICAL at x=75
- **LONG STRING**: Now HORIZONTAL at y=25 (runs length of table)
- **CENTER STRING**: Now VERTICAL at x=50 (connects side pockets)
- **GRID LINES**: Realigned to match diamond positions

### Orientation Clarified:
```
HORIZONTAL LAYOUT:
- Long axis = X (100 units)
- Short axis = Y (50 units)
- HEAD rail = LEFT (x=0) - breaking end, KITCHEN is here
- FOOT rail = RIGHT (x=100) - racking end, FOOT SPOT is here
- LONG rails = TOP (y=0) and BOTTOM (y=50)
- Side pockets on LONG rails at x=50
```

### Spot Positions:
- Head Spot: (25, 25) - 2 diamonds from head rail
- Center Spot: (50, 25) - exact center
- Foot Spot: (75, 25) - 2 diamonds from foot rail (rack apex here)

### String Orientations:
- Head String: VERTICAL x=25 (parallel to head rail)
- Foot String: VERTICAL x=75 (parallel to foot rail)
- Long String: HORIZONTAL y=25 (runs length through all spots)
- Center String: VERTICAL x=50 (connects side pockets)

---

## v003 - Corrected Pocket Orientation (2025-12-07)
**File:** `versions/pool-table-v003.svg`

### Major Fixes:
- **Removed inverted bracket shapes** - deleted confusing `path` elements
- **Pocket openings now face table center** (correct)
- **Drop holes positioned away from table** (in corners/behind rails)
- **Added radial gradients** for depth effect (darker toward drop, lighter toward opening)

### Pocket Orientation Principle:
```
CORNER POCKET (top-left example):

     RAIL (outside table)
         ╲
          ●━━━ Dark drop hole (deepest, in corner)
         ╱░░░
        ╱░░░░░ Gradient shelf area
       ░░░░░░░
      ────────── Opening faces TABLE CENTER
         PLAYING SURFACE

The OPENING (lighter) faces the table
The DROP HOLE (darkest) is tucked into the corner
```

### Gradient Logic:
| Pocket | Opening Faces | Dark Hole Position |
|--------|---------------|-------------------|
| Top-Left | +x, +y (toward center) | -x, -y (in corner) |
| Top-Right | -x, +y (toward center) | +x, -y (in corner) |
| Bottom-Left | +x, -y (toward center) | -x, +y (in corner) |
| Bottom-Right | -x, -y (toward center) | +x, +y (in corner) |
| Top Side | +y (down into table) | -y (behind rail) |
| Bottom Side | -y (up into table) | +y (behind rail) |

### New Definitions Added:
- `pocket-gradient-tl`, `pocket-gradient-tr`, `pocket-gradient-bl`, `pocket-gradient-br`
- `pocket-gradient-side-top`, `pocket-gradient-side-bottom`
- `pocket-inner-shadow` filter

---

## v004 - Fixed Pocket Throat Areas (2025-12-07)
**File:** `versions/pool-table-v004.svg`

### Fix:
- **Eliminated dark brown gaps** between cushion ends and pockets
- Added green cloth polygons to fill pocket throat areas:
  - 4 corner pocket throat fills
  - 4 side pocket throat fills (2 per pocket, left and right)
  - 4 head/foot rail pocket transition fills

### Areas Filled (all #0a7a45 green):
```
CORNER POCKETS: Small triangles at each corner
  - Top-left: (2,2)-(6,2)-(2,6)
  - Top-right: (98,2)-(94,2)-(98,6)
  - Bottom-left: (2,48)-(6,48)-(2,44)
  - Bottom-right: (98,48)-(94,48)-(98,44)

SIDE POCKETS: Triangles flanking each side pocket
  - Top-left of pocket: (45,2)-(47,0)-(50,0)-(50,2)
  - Top-right of pocket: (55,2)-(53,0)-(50,0)-(50,2)
  - (same pattern for bottom)

HEAD/FOOT RAIL TRANSITIONS: Fill between cushion end and corner
  - Head top: (2,6)-(0,4)-(0,0)-(2,2)
  - Head bottom: (2,44)-(0,46)-(0,50)-(2,48)
  - (same pattern for foot rail)
```

---

## v005 - Proper Scalloped Pocket Structure (2025-12-07)
**File:** `versions/pool-table-v005.svg`

### Complete Pocket Redesign:
Based on research into actual pool table construction:

**Key terminology:**
- **SLATE** - The playing bed that extends under rails; has scalloped cutouts for pockets
- **DROP HOLE** - Dark circular opening where ball falls
- **SHELF** - Cloth-covered ledge between cushion jaws and drop hole
- **JAWS** - Angled ends of cushions forming pocket entrance (142° corners, 103° sides)

### New Pocket Structure:
```
CORNER POCKET SCALLOP (top-left example):

    RAIL ══════════
         ╲
          ╲   ← Cushion jaw (angled end)
           ╲
         ╭──╮
        │░░░░│ ← Green SHELF (quarter-circle, cloth-covered slate)
        │░●░░│ ← Dark DROP HOLE (center, r=2.5)
        │░░░░│
         ╰──╯
           ╱
          ╱   ← Cushion jaw
    RAIL ══════════
```

### Corner Pockets:
- Drop hole: `<circle cx="0" cy="0" r="2.5">` at exact corner
- Shelf: Quarter-circle path from radius 2.5 to 5
- Creates proper "scallop" visual

### Side Pockets:
- Drop hole: `<ellipse rx="2.8" ry="2.5">` extending into rail
- Minimal shelf crescents on sides

### Removed:
- Confusing radial gradients on pockets
- Offset ellipse positions that didn't match corners

---

## v006 - Boolean Subtraction Pocket Architecture (2025-12-07)
**File:** `versions/pool-table-v006.svg`

### Complete Architecture Redesign:
Implemented proper "boolean subtraction" approach for pockets, as requested:

**Concept:** Pockets are NOT separate shapes - they are CUTOUTS in the slate, like "biting corners off a sandwich."

### Layer Structure (Bottom to Top):
1. **Layer 3: POCKET VOIDS** - Dark circles/ellipses representing the drop holes
   - Corner voids: `<circle r="5.5">` centered at (0,0), (100,0), (0,50), (100,50)
   - Side voids: `<ellipse rx="4" ry="3.5">` at (50,0) and (50,50)
   - Fill: #050505 (near-black)

2. **Layer 4: SLATE/CLOTH** - Single path with SCALLOPED CUTOUTS
   - Slate extends under rails (from -2 to 102, -2 to 52)
   - Path uses SVG arc commands to create smooth scallops
   - Quarter-circle cutouts at corners (r=5.5)
   - Semi-ellipse cutouts at sides (rx=4, ry=3.5)
   - Scallops reveal the dark voids underneath

3. **Layer 5: CUSHIONS** - Sit on top, framing pocket openings
   - Positions aligned to scallop edges (5.5 from corners, 46-54 at sides)
   - Do NOT overlap into pocket areas

### SVG Path Technique:
```
<path d="
  M -2,5.5                       ← Start after top-left scallop
  A 5.5,5.5 0 0,1 5.5,-2         ← Quarter-circle scallop
  L 46,-2                        ← Edge to side pocket
  A 4,3.5 0 0,1 54,-2            ← Semi-ellipse scallop
  L 94.5,-2                      ← Edge to top-right
  A 5.5,5.5 0 0,1 102,5.5        ← Quarter-circle scallop
  ...continues around...
  Z
"/>
```

### Key Understanding:
- The SLATE is the cloth-covered playing bed
- It extends UNDER the wooden rails
- Pockets are ROUTED/CUT OUT of the slate
- This creates the "scalloped" appearance at pocket locations
- The dark void layer shows through the cutouts

---

## v007 - Tournament Blue Color Scheme & BCA Side Pocket Specs (2025-12-07)
**File:** `versions/pool-table-v007.svg`

### Color Scheme Update:
Changed from green cloth to **Tournament Blue (Simonis 860)**:
- Main cloth: `#50a6c2` (Tournament Blue)
- Texture light: `#5ab0cc`
- Texture dark: `#4596b2`
- Cushion highlights: `#60b8d4`

Based on research into Jasmin Ouschan's diagrams and professional tournament table colors.

### Side Pocket Refinements:
Updated to better match **BCA specifications**:
- Mouth width: 6 units (previously 8), closer to BCA spec of 4.875"-5.625"
- Void ellipse: `rx=3, ry=2.5` (previously rx=4, ry=3)
- Scallop depth: 0.3 units (BCA shelf spec: 0"-0.375")
- Cushion split: x=47 to x=53 (previously x=46 to x=54)

### BCA Side Pocket Reference:
- Mouth: 4⅞" to 5⅝" minimum to maximum
- Entrance angle: 103° (±2°) - acute compared to 142° corners
- Shelf: 0" to ⅜" - virtually no shelf
- Vertical angle: 12° to 15°

### Sources:
- [BCA Pocket Specifications](https://www.pooltablefeltcloth.com/cushions-supplies/billiard-congress-of-america-pocket-specs.html)
- [Dr. Dave Pool Templates](https://drdavepoolinfo.com/resources/templates/)

---

## v008 - Cushion Outlines, Grid Alignment, Target Spots (2025-12-07)
**File:** `versions/pool-table-v008.svg`

### Changes:

**1. Cushion/Bumper White Outlines:**
- All 6 cushion polygons now have `stroke="#ffffff" stroke-width="0.3"`
- Creates clean white border around entire bumper perimeter
- Removed old cushion nose highlight lines (redundant)

**2. 4x8 Grid of Perfect Squares:**
- Each cell is exactly 12.5 × 12.5 units
- Vertical lines at x = 12.5, 25, 37.5, 50, 62.5, 75, 87.5
- Horizontal lines at y = 12.5, 25, 37.5
- Grid exists only inside cushion noses (y=2 to y=48, x=2 to x=98)
- Perfectly aligned to diamond sight positions on rails
- Increased opacity to 0.3 for better visibility
- Uniform stroke width (0.15) on all lines
- Strings layer hidden (grid serves same purpose)

**3. Traditional Target-Style Spots:**
- Black circle with white center dot design
- Head Spot at (25, 25): r=0.8 black, r=0.25 white center
- Center Spot at (50, 25): r=0.6 black, r=0.2 white center
- Foot Spot at (75, 25): r=0.8 black, r=0.25 white center
- All spots at diamond intersections on long string (y=25)

---

## v009 - Simplified Frame & Cushion Refinements (2025-12-07)
**File:** `versions/pool-table-v009.svg`

### Changes:

**1. Removed Outer Frame:**
- Eliminated dark brown/grey outer border (Layer 1 removed)
- Wood grain rail now serves as the outermost visual element

**2. Rounded Rail Corners:**
- Rail frame now uses single path with `r=4` rounded outer corners
- Cleaner appearance without sharp rectangular edges
- Inner cutout follows playing surface boundary

**3. Cushion Outline Refinements:**
- Changed stroke color from white to `#a8d3e1` (halfway between white and blue)
- Using `paint-order: stroke fill` for inside-only stroke effect
- Stroke width increased to 0.5 for visibility

**4. Removed Rail Decorative Line:**
- Eliminated the dark `#2a1810` stroke line running through wood grain next to diamonds

---

## Current Working Version
**Latest:** v009
**Active file:** `pool-table-template.svg`
