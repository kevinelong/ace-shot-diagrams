# UI/UX Testing Suite

## Overview
This directory contains comprehensive UI/UX tests for the ACE Shot Diagrams application, with a focus on cross-resolution compatibility and interaction testing.

## Test Categories

### 1. Palette Minimize Tests (`palette-minimize.spec.ts`)
Tests the minimize functionality for all palettes (Balls, Cue Control, Legend, Game, Shot Info, Actions, Save, Aids) across multiple screen resolutions.

**Key Tests:**
- Minimize buttons don't trigger table interactions (ball movement)
- Ball positions remain unchanged when clicking minimize
- Minimize state toggles correctly (− ↔ +)
- Multiple palettes can be minimized independently
- Selected balls don't move when clicking palette UI

**Tested Resolutions:**
- 1920x1080 (Full HD Desktop)
- 1366x768 (Common Laptop)
- 1536x864 (Scaled Display)
- 2560x1440 (2K Desktop)
- 1280x720 (HD)

## Running Tests

### Run all UI/UX tests:
```bash
npx playwright test tests/ui-ux/
```

### Run specific resolution test:
```bash
npx playwright test tests/ui-ux/palette-minimize.spec.ts -g "1920x1080"
```

### Run with visual output:
```bash
npx playwright test tests/ui-ux/ --headed
```

### Generate screenshots only:
```bash
npx playwright test tests/ui-ux/ --grep "Visual"
```

### Debug specific test:
```bash
npx playwright test tests/ui-ux/palette-minimize.spec.ts --debug
```

## Visual Regression Testing

Screenshots are automatically captured during test runs and stored in `tests/ui-ux/screenshots/`.

**Screenshot Types:**
- Full page captures at each resolution
- Individual palette screenshots (normal state)
- Individual palette screenshots (minimized state)
- Before/after comparison screenshots

## Known Issues Fixed

### Issue: Minimize button click-through
**Problem:** Clicking minimize buttons on palettes (especially Save palette) would trigger table interactions, causing balls to move or other unintended behaviors.

**Root Causes:**
1. `startDrag()` function was attached to entire document
2. Palettes `actions`, `save`, and `aids` were not registered in the `palettes` object
3. Their minimize/close buttons were never set up by `setupPaletteControls()`

**Fix Applied:**
1. Added early return in `startDrag()` to ignore clicks on `.tool-palette` elements
2. Registered all palettes in the `palettes` object
3. All palette controls now properly initialized

## Test Assertions

Each test verifies:
1. ✅ Minimize button is visible and clickable
2. ✅ Palette body hides when minimized
3. ✅ Button text changes: − → +
4. ✅ Ball positions don't change
5. ✅ No table interactions occur
6. ✅ Expand (unmminimize) works correctly
7. ✅ Other palettes unaffected
8. ✅ Palette stays within viewport bounds

## Performance Metrics

Tests include timing measurements to ensure:
- Minimize animation completes < 300ms
- No janky interactions
- Smooth state transitions

## Accessibility Considerations

Future tests should include:
- Keyboard navigation (Tab, Enter, Escape)
- Screen reader compatibility
- Focus management
- ARIA labels validation
