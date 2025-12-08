# ACE Shot Diagrams

Pool table SVG template for creating shot diagrams.

## Project Structure

- `pool-table-template.svg` - Main SVG template (v008)
- `pool-table-labeled.svg` - Labeled version for reference
- `preview.html` - Interactive preview with draggable balls
- `versions/` - Version history (v001-v008)

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

## preview.html Features (2024-12-07)

- Draggable balls: CUE, GHOST (aim), 1-15, generic gray
- Ball rack below table, centered
- Drag onto playing surface to place
- Drag off table to return to rack
- Dotted line between cue and ghost balls when both placed
- Print-friendly: ball positions preserved, rack hidden
- Touch support for mobile
- Responsive: repositions on resize

## Usage

Open `preview.html` in browser. Drag balls from rack onto table to create shot diagrams. Print (Ctrl+P) to save diagram with ball positions.

## TODO

- [ ] Add shot path drawing tools
- [ ] Save/load diagram configurations
- [ ] Export as PNG/PDF
- [ ] Multiple ball instances for position sequences
