# Pool Table SVG Diagram Research Notes
## Project: ACE Shot Diagrams - Componentized Pool Table SVG

---

## 1. PLAYING SURFACE DIMENSIONS (9-ft Regulation Table)

### Primary Measurements
- **Playing Surface:** 100" x 50" (2:1 ratio)
- **Diamond Spacing (long rail):** 12.5" (100 ÷ 8 = 12.5)
- **Diamond Spacing (short rail):** 12.5" (50 ÷ 4 = 12.5)
- **Total diamonds:** 18 (3 on each short rail, 6 on each long rail, minus corners)

### Grid System
- **Long rail segments:** 8 segments
- **Short rail segments:** 4 segments
- **Creates a 4x8 grid** on playing surface
- Each grid cell = 12.5" x 12.5" square

### Overall Table (with rails)
- **Rail width:** 4-7.5" (including cushion)
- **Cushion cloth width:** 1.875" to 2"
- **Total outer dimensions:** Approximately 116" x 66" (varies by manufacturer)

---

## 2. TABLE ANATOMY - TOP-DOWN VIEW LAYERS (Inside to Outside)

### Layer 1: Playing Surface (Innermost)
- Green baize/cloth
- Flat slate bed covered with tightly woven worsted wool
- Color: Traditional green (#0a5c36 or similar)

### Layer 2: Surface Markings
- **Foot Spot** - Where apex ball is racked
- **Head Spot** - In the kitchen area
- **Center Spot** - Dead center of table
- **Head String** - Imaginary line through head spot (kitchen line)
- **Foot String** - Imaginary line through foot spot
- **Center String** - Line connecting side pockets
- **Long String** - Line from head spot to foot spot (center line)

### Layer 3: Cushions (Rubber)
- Triangular profile (K66 for pool, L77 for snooker)
- Cloth-covered rubber
- Height: 63.5% of ball diameter (~1.425" for 2.25" balls)
- Width: 1.875" - 2"

### Layer 4: Rails (Wood)
- Surround the cushions
- Contains the diamond sights/markers
- Wood construction, often with decorative veneer

### Layer 5: Pockets (6 total)
- **4 Corner Pockets:** 4.5" - 5.125" opening, 142° cut angle
- **2 Side Pockets:** 5" - 5.625" opening, 104° cut angle
- Corner pockets have "knuckles" (sharp edges in pool, rounded in snooker)
- Drop into gulley/return system below

### Layer 6: Outer Frame/Cabinet
- Decorative exterior
- Legs/supports (not visible in top-down)

---

## 3. SPOT AND STRING POSITIONS

### Foot End (Racking End)
```
Position from foot rail (short rail):
- Foot Spot: 2 diamonds up from foot rail = 25" from cushion nose
- Located at intersection of foot string and long string
```

### Head End (Breaking End)
```
Position from head rail:
- Head Spot: 2 diamonds up from head rail = 25" from cushion nose
- The "Kitchen" = area between head rail and head string
- Ball-in-hand after scratch must be placed in kitchen
```

### Center
```
- Center Spot: Exact middle (50" from each end rail, 25" from each side rail)
- Intersection of center string and long string
```

### String Definitions
| String Name | Definition |
|-------------|------------|
| Head String | Line through head spot, parallel to head rail (kitchen line) |
| Foot String | Line through foot spot, parallel to foot rail |
| Center String | Line connecting side pockets |
| Long String | Center line from head spot through center spot to foot spot |

---

## 4. DIAMOND/SIGHT SYSTEM

### Numbering Convention (for diamond system calculations)
```
FOOT RAIL (Short rail - 4 segments, 3 diamonds + 2 corners = 5 points)
   1    2    3    4    5
   ●----●----●----●----●

LONG RAIL (8 segments, 7 diamonds + 2 corners = 9 points)
   1  2  3  4  5  6  7  8  9
   ●--●--●--●--●--●--●--●--●
```

### Diamond Positions (from corner)
- Diamonds are placed at equal intervals
- 9-ft table: 12.5" between diamonds
- Located on the rail surface (visible from top)

### Grid Intersection Points
- The invisible grid lines connect corresponding diamonds
- Creates reference points for aiming systems
- "Corner Five" system, "Plus Two" system use these

---

## 5. GAME-SPECIFIC MARKINGS

### 8-Ball / 9-Ball / 10-Ball
- **Required:** Foot spot (for racking)
- **Optional:** Head string (for kitchen)
- Rack position marked by foot spot only

### Straight Pool (14.1 Continuous)
- **Required:**
  - Foot spot
  - Triangle outline (on cloth exterior)
  - Line from foot spot to center of foot rail
- **Optional:**
  - Head string/kitchen line
  - Head spot (small cross)
  - Center spot

### One Pocket
- **Required:**
  - Head string (heavily used for ball spotting)
  - Foot spot
- Head string more critical than in other games

### Carom/Three-Cushion Billiards
- No pockets
- Different diamond numbering
- Additional reference lines for systems

---

## 6. SHOT DIAGRAMMING CONVENTIONS

### Ball Representation
- Circles with numbers (1-15 for pool)
- Cue ball: White/outlined, often with crosshairs for spin indication
- Standard ball diameter: 2.25" (scale accordingly)

### Line Types
- **Solid lines:** Ball path before contact
- **Dashed lines:** Ball path after contact / ghost ball position
- **Arrows:** Direction of travel
- **Colored lines:** Match ball color for clarity

### Notation Elements (Dr. Dave System)
- **P = Power:** 1.0 = power to move cue ball one table length
- **E = Error:** Error type classification
- **Large ball diagram:** Shows cue ball contact point
- **Small ball reference:** Exact scale reference

### Spin Indicators
- Crosshairs on cue ball showing:
  - Center = no english
  - Left/Right = side spin (english)
  - Top = follow
  - Bottom = draw
  - Combinations for masse, curve shots

---

## 7. SVG COMPONENT STRUCTURE (Proposed)

### Recommended Layer Order (bottom to top in SVG)
```
1. table-outer-frame      - Decorative outer edge
2. table-rails           - Wooden rail surface
3. table-pockets         - Pocket openings and surrounds
4. table-cushions        - Rubber cushion noses
5. table-cloth           - Green playing surface
6. table-diamonds        - Diamond/sight markers on rails
7. markings-strings      - Head/foot/center strings (optional visibility)
8. markings-spots        - Head/foot/center spots
9. markings-grid         - 4x8 reference grid (chalk-like appearance)
10. markings-triangle    - Rack outline (for straight pool)
11. balls-object         - Object balls (numbered)
12. balls-cue            - Cue ball with spin indicator
13. shot-paths           - Lines, arrows, paths
14. annotations          - Text, labels, measurements
```

### Component Naming Convention
```svg
<g id="layer-{name}">
  <g id="{name}-{subcomponent}">
    <!-- elements -->
  </g>
</g>
```

### Suggested viewBox for 9-ft table
```svg
<!-- Playing surface only -->
<svg viewBox="0 0 100 50">

<!-- With rails (approximate) -->
<svg viewBox="-8 -8 116 66">

<!-- With margins for annotations -->
<svg viewBox="-15 -15 130 80">
```

---

## 8. COLOR PALETTE

### Traditional Colors
| Element | Color | Hex |
|---------|-------|-----|
| Cloth (Championship) | Green | #0a5c36 |
| Cloth (Simonis Blue) | Tournament Blue | #0066a1 |
| Cloth (Wine/Burgundy) | Burgundy | #722f37 |
| Rails (Dark Wood) | Mahogany | #4a2c2a |
| Rails (Light Wood) | Oak | #c4a35a |
| Cushion Cloth | Match playing surface | - |
| Diamonds | Mother of Pearl / Brass | #f5f5dc / #b5a642 |
| Spots | White or Black | #ffffff / #000000 |
| Grid Lines | Chalk-like | #ffffff (semi-transparent) |

### Ball Colors (Solids 1-7, Stripes 9-15)
| Ball | Color | Hex |
|------|-------|-----|
| 1, 9 | Yellow | #ffd700 |
| 2, 10 | Blue | #0000cd |
| 3, 11 | Red | #ff0000 |
| 4, 12 | Purple | #800080 |
| 5, 13 | Orange | #ff8c00 |
| 6, 14 | Green | #008000 |
| 7, 15 | Maroon | #800000 |
| 8 | Black | #000000 |
| Cue | White | #ffffff |

---

## 9. REFERENCE SOURCES

### Diagramming Tools
- [ChalkySticks Pad](https://www.chalkysticks.com/pad) - Online diagrammer
- [Cue Lab iOS App](https://www.brightmediums.com/cue-lab) - Realistic shot paths
- [Dr. Dave Pool Info](https://drdavepoolinfo.com/resources/templates/) - Templates

### Specifications
- [PoolRoom Tournament Specs](https://www.poolroom.com/tournament-table-equipment-specifications/)
- [Dr. Dave Table Sizes](https://drdavepoolinfo.com/faq/table/sizes/)
- [Imperial Billiards Diamond System](https://www.imperialusa.com/post/how-to-use-the-dots-on-a-pool-table)

### Anatomy Guides
- [Bar Games 101](https://bargames101.com/pool-table-anatomy/)
- [Wikipedia - Billiard Table](https://en.wikipedia.org/wiki/Billiard_table)
- [AzBilliards Forum](https://forums.azbilliards.com/threads/complete-table-markings-for-straight-pool.551024/)

### SVG Resources
- [SVG Repo Pool Table](https://www.svgrepo.com/svg/14972/pool-table-top-view)
- [FreeSVG Pool Table](https://freesvg.org/vector-clip-art-of-pool-table-with-cue-and-balls-top-view)

---

## 10. IMPLEMENTATION NOTES

### Key Design Decisions
1. **Use relative units** - Design at 100x50 scale, transform as needed
2. **Separate concerns** - Each visual element in its own group
3. **Toggle-able layers** - Strings, grid, spots should be independently visible
4. **Semantic IDs** - Clear naming for programmatic manipulation
5. **CSS classes** - For theming (different cloth colors, wood finishes)

### Accessibility Considerations
- Include `<title>` and `<desc>` elements
- Use `role="img"` on outer SVG
- Provide `aria-label` for interactive elements

### Animation Potential
- Ball movement along paths
- Shot trajectory preview
- Spin indicator rotation

---

## NEXT STEPS

1. Create base SVG with all layers
2. Implement chalk-like grid overlay
3. Add spot and string toggles
4. Create ball components with numbers
5. Build shot path drawing system
6. Add annotation/text capabilities
7. Test with actual shot diagrams
