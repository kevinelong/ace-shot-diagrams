# ACE Shot Diagrams - Feature Roadmap

## Current State (What We Have)
- Interactive drag-and-drop ball placement
- Automatic kick shot solving (1-rail and 2-rail)
- Cut angle calculation with approach-angle awareness
- Bank shot detection and visualization
- Combination shot system
- Game mode rules (9-ball, 8-ball, 10-ball, straight pool, one-pocket)
- Mirror system aiming overlay for kick shots
- Ghost ball positioning with AIM indicator
- English/spin selector with cue ball diagram
- Power slider with physics-based path prediction
- Shot difficulty scoring
- Object ball and cue ball final position indicators

---

## FEATURES WE WANT TO IMPLEMENT

### Phase 1: Quick Wins (High Value, Low Effort)

#### 1.1 PNG/SVG Export
- **Value**: HIGH - Users need to share diagrams on forums, social media, coaching materials
- **Effort**: 2-3 hours
- **Details**: Export current table state as image file

#### 1.2 URL State Sharing
- **Value**: HIGH - Instant sharing without file downloads
- **Effort**: 3-4 hours
- **Details**: Encode ball positions, pocket selection, settings in URL hash

#### 1.3 Tangent Line Toggle
- **Value**: MEDIUM - Fundamental teaching tool for position play
- **Effort**: 1-2 hours
- **Details**: Show 90° line from contact point (where CB goes with stop shot)

#### 1.4 Natural Angle Line
- **Value**: MEDIUM - Shows where CB goes with center-ball follow
- **Effort**: 1 hour
- **Details**: 30° deflection from tangent based on cut angle

#### 1.5 Shot Make Probability Display
- **Value**: MEDIUM - More intuitive than abstract "difficulty score"
- **Effort**: 2 hours
- **Details**: Convert difficulty score to percentage (e.g., "78% make rate")

#### 1.6 Random Rack Button
- **Value**: MEDIUM - Practice tool for random scenarios
- **Effort**: 1 hour
- **Details**: Scatter balls randomly on table (respecting physics)

---

### Phase 2: Core Enhancements (High Value, Medium Effort)

#### 2.1 Shape Zone Visualization
- **Value**: HIGH - Critical for teaching position play
- **Effort**: 4-6 hours
- **Details**: Triangular zone showing where CB can be to make next shot

#### 2.2 Safety Shot Mode
- **Value**: HIGH - No competitor does this well
- **Effort**: 6-8 hours
- **Details**: Show snooker zones, optimal defensive positions

#### 2.3 Multi-Shot Sequences
- **Value**: HIGH - Plan entire run-outs
- **Effort**: 8-10 hours
- **Details**: Chain shots together, show numbered sequence

#### 2.4 Local Storage Save/Load
- **Value**: HIGH - Persist work between sessions
- **Effort**: 3-4 hours
- **Details**: Save named diagrams to browser localStorage

#### 2.5 Drill Mode with Scoring
- **Value**: MEDIUM - Structured practice
- **Effort**: 6-8 hours
- **Details**: Pre-built drills with success tracking

---

### Phase 3: Advanced Features (Medium Value, Higher Effort)

#### 3.1 Undo/Redo System
- **Value**: MEDIUM - Quality of life improvement
- **Effort**: 4-5 hours
- **Details**: Track state changes, allow reversal

#### 3.2 Table Size Options
- **Value**: MEDIUM - Support 7ft, 8ft, 9ft tables
- **Effort**: 3-4 hours
- **Details**: Adjust dimensions while maintaining ball scale

#### 3.3 Print-Friendly View
- **Value**: MEDIUM - Physical handouts for coaching
- **Effort**: 2-3 hours
- **Details**: CSS print stylesheet, clean B&W option

#### 3.4 Keyboard Shortcuts
- **Value**: LOW-MEDIUM - Power user efficiency
- **Effort**: 2-3 hours
- **Details**: Arrow keys for fine positioning, hotkeys for tools

---

## FEATURES WE DO NOT WANT TO IMPLEMENT

### 1. Camera-to-Diagram (Ball Detection from Photo)
- **Why Not**: Requires ML/CV infrastructure, mobile camera access, lighting calibration
- **Effort**: 40+ hours, ongoing maintenance
- **Alternative**: Manual placement is fast enough for our use case

### 2. Real-Time AR Overlay
- **Why Not**: Requires native mobile app, not web-compatible
- **Effort**: Separate project entirely
- **Alternative**: Our web tool works on any device

### 3. Massé/Curve Path Physics
- **Why Not**: Complex 3D physics simulation, edge case shots
- **Effort**: 20+ hours for questionable accuracy
- **Alternative**: Users can draw curved paths manually if needed

### 4. User Accounts & Cloud Sync
- **Why Not**: Backend infrastructure, authentication, GDPR compliance
- **Effort**: 30+ hours + ongoing server costs
- **Alternative**: URL sharing + localStorage covers 90% of use cases

### 5. Video Recording/Playback
- **Why Not**: Large file sizes, hosting costs, complex UI
- **Effort**: 15+ hours
- **Alternative**: Users can screen record if needed

### 6. Projection System Integration
- **Why Not**: Requires hardware (projector + Raspberry Pi), niche audience
- **Effort**: 20+ hours + hardware testing
- **Alternative**: Export PNG can be used with existing projection systems

### 7. Mobile Native App
- **Why Not**: Separate codebase, app store maintenance, review processes
- **Effort**: 60+ hours
- **Alternative**: PWA/responsive web works on mobile browsers

### 8. Multiplayer/Real-Time Collaboration
- **Why Not**: WebSocket infrastructure, conflict resolution, hosting costs
- **Effort**: 25+ hours
- **Alternative**: Share URLs for async collaboration

### 9. AI Shot Recommendations ("Best Shot" Solver)
- **Why Not**: Requires game theory AI, opponent modeling, complex heuristics
- **Effort**: 40+ hours
- **Alternative**: Our solver already finds viable shots; strategy is user's job

### 10. Paid Features / Subscription Model
- **Why Not**: Payment integration, customer support, ongoing obligations
- **Effort**: 15+ hours + legal/business complexity
- **Alternative**: Keep it free, focus on utility

---

## Implementation Priority Order

1. **PNG Export** - Immediate value, enables sharing
2. **URL State Sharing** - Zero-friction sharing
3. **Tangent Line Toggle** - Teaching fundamental
4. **Shape Zone Visualization** - Position play teaching
5. **Local Storage Save/Load** - Persistence
6. **Safety Shot Mode** - Unique differentiator
7. **Multi-Shot Sequences** - Run-out planning
8. **Natural Angle Line** - Complements tangent line
9. **Random Rack Button** - Practice variety
10. **Shot Make Probability** - Intuitive difficulty display

---

## Implementation Summary

### Sprint 1: Sharing & Export (Week 1)
| Feature | Hours | Files to Modify |
|---------|-------|-----------------|
| PNG Export | 3h | index.html (add export function + button) |
| SVG Export | 1h | Same function, different output |
| URL State Sharing | 4h | encode/decode functions, URL hash handling |
| Copy Link Button | 1h | UI button + clipboard API |

### Sprint 2: Position Play Aids (Week 2)
| Feature | Hours | Files to Modify |
|---------|-------|-----------------|
| Tangent Line Toggle | 2h | Add SVG element + calculation |
| Natural Angle Lines | 2h | Follow/draw lines (extension of tangent) |
| Shape Zone Visualization | 6h | Zone polygon generation + shadow handling |

### Sprint 3: Advanced Features (Week 3+)
| Feature | Hours | Files to Modify |
|---------|-------|-----------------|
| Safety Shot Mode | 8h | New mode + snooker zone calculations |
| Multi-Shot Sequences | 10h | Sequence data structure + UI panel |
| Local Storage Save | 4h | Save/load named diagrams |

---

## Key Implementation Details

### PNG/SVG Export
- Clone SVG, remove interactive elements (pocket targets, palettes)
- Set explicit dimensions (800x450 or 1600x900 for hi-res)
- For PNG: draw SVG to canvas via Image element, then toBlob()
- Add optional title overlay

### URL State Sharing
- Compact format: `#v1|cue:25.5,32.1|1:60,25|p:br|b:1|m:9|f:6`
- ~200 chars for typical diagram (well under URL limits)
- Use history.replaceState() to update without page reload
- Decode on page load, apply state to diagram

### Tangent Line
- Always 90° perpendicular to ghost→OB direction
- Determine CB travel direction based on which side of cut
- Extend to table edge, clip at rails
- Dashed cyan line, labeled "STOP"

### Shape Zone
- Triangular region from ghost ball extending outward
- Bounded by ±65° max cut angle
- Max distance ~50 SVG units
- Semi-transparent green overlay
- Handle "shadows" from blocking balls

### Safety Mode
- Calculate "snooker cones" behind blocker balls
- Score positions by: distance, snooker quality, kick difficulty
- Visualize opponent's blocked sight lines
- Suggest best CB landing zones

### Multi-Shot Sequences
- Array of shots with cbStart, cbEnd, ball, pocket, english, power
- Edit any shot; subsequent shots auto-update
- Overview mode shows all paths with numbers
- Animate playback option
- Validate sequence for physical possibility
