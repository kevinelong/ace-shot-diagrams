# ACE Shot Diagrams - Playwright Tests

## Overview

This directory contains comprehensive user-oriented Playwright tests for ACE Shot Diagrams. These tests focus on **user intent and experience**, not just code coverage.

## Philosophy

Every test asks:
1. **"What is the user trying to accomplish?"**
2. **"Does the UI clearly communicate what's happening?"**
3. **"Does the app provide appropriate feedback?"**

## Test Structure

```
tests/
├── setup/
│   └── test-helpers.ts          # AceShotHelper, the shot/rack waits, readiness helpers
├── critical-path/               # Must-work features
│   ├── 01-ball-placement.spec.ts
│   ├── 02-pocket-selection.spec.ts
│   └── 03-shot-calculation.spec.ts
├── features/                    # Individual features
│   ├── aim-consistency.spec.ts   # the stick and the aim must agree, on selection changes
│   ├── english-controls.spec.ts
│   ├── mobile.spec.ts           # Mobile + tablet viewports
│   ├── power-control.spec.ts
│   ├── rack-start.spec.ts
│   ├── safety-zones.spec.ts      # Snooker zones (roadmap 2.2)
│   ├── shot-animation.spec.ts   # Records video on purpose (the artefact is its point)
│   └── shot-types/
│       └── kick-shots.spec.ts
├── ui-ux/
│   └── palette-minimize.spec.ts # Palette behaviour across five resolutions
└── quick-validation.spec.ts     # Smoke checks
```

## Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run install
```

## Running Tests

```bash
# Run all tests (headless)
npm test

# Run with UI visible
npm test:headed

# Run in Playwright UI mode (recommended for development)
npm test:ui

# Run specific browser
npm test:chrome
npm test:firefox
npm test:safari

# Run specific test suite
npm test:critical
npm test:features

# Debug mode
npm test:debug

# Update visual snapshots
npm test:update-snapshots

# View test report
npm run report
```

## Writing New Tests

### Use the AceShotHelper

```typescript
import { test, expect } from '../setup/test-helpers';

test('my test', async ({ page, aceHelper }) => {
  await page.goto('/');
  
  // Use helper methods for common actions
  await aceHelper.dragBallToTable(1, 500, 400);
  await aceHelper.selectObjectBall(1);
  await aceHelper.selectPocket('TR');
  
  // Make assertions
  expect(await aceHelper.isGhostBallVisible()).toBe(true);
});
```

### Test User Intent, Not Code

❌ **Bad**: "Test that calculateCutAngle() returns correct value"
✅ **Good**: "User wants to understand shot difficulty - verify angle is displayed clearly"

### Include User Context

```typescript
test('should select object ball by double-clicking', async ({ page, aceHelper }) => {
  // USER INTENT: "I want to shoot at ball #1"
  
  // Setup: Place balls on table
  await aceHelper.dragBallToTable(0, 300, 600); // cue ball
  await aceHelper.dragBallToTable(1, 500, 400); // object ball
  
  // USER ACTION: Double-click ball 1 to select it
  await aceHelper.selectObjectBall(1);
  
  // EXPECTED OUTCOME: Ball 1 is highlighted/selected
  expect(await aceHelper.isGhostBallVisible()).toBe(true);
});
```

## Test Categories

### 🎯 Critical Path
Core workflows that must never break. These run first in CI.

### ✨ Features
Individual feature verification.

### 🎨 Visual
Screenshot comparisons and visual feedback verification.

### 🚨 Error Handling
Edge cases and error states.

### ♿ Accessibility
Keyboard navigation and screen reader support.

## Available Helper Methods

### Ball Placement
- `dragBallToTable(ballNumber, x, y)`
- `selectObjectBall(ballNumber)`
- `isBallOnTable(ballNumber)`

### Pocket Selection
- `selectPocket(pocketId)` - Use 'TL', 'TR', 'ML', 'MR', 'BL', 'BR'
- `getSelectedPocket()`

### Shot Analysis
- `isGhostBallVisible()`
- `getCutAngle()`
- `isTargetLineVisible()`
- `isCueBallPathVisible()`
- (removed) `waitForShotCalculation()` - each action now waits for its own effect in the app's state

### Controls
- `setEnglish(x, y)` - Range: -1 to 1
- `setPower(percentage)` - Range: 0 to 100
- `setGameMode(mode)`

### Shot Types
- `enableKickSolver()`
- `isKickModeActive()`
- `isComboShotDetected()`
- `isBankShotDetected()`

### UI
- `minimizePalette(paletteId)`
- `closePalette(paletteId)`
- `clearLocalStorage()`

## Pocket IDs

Use these constants from `test-helpers.ts`:

```typescript
POCKETS.TL  // top-left
POCKETS.TR  // top-right
POCKETS.ML  // middle-left
POCKETS.MR  // middle-right
POCKETS.BL  // bottom-left
POCKETS.BR  // bottom-right
```

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Pushes to main branch

Configuration in `.github/workflows/` (to be created).

## Debugging Failed Tests

1. **Run in headed mode**: `npm test:headed`
2. **Use Playwright UI**: `npm test:ui`
3. **Check screenshots**: `test-results/` directory
4. **View trace**: Open trace files in Playwright Trace Viewer

## Common Issues

### Protocol
The suite never loads the app from disk for the reason the old note gave. It is
`file://` that is *not* the default: `playwright.config.ts` starts its own server
(`npx http-server -p 8080 -c-1`) and every spec navigates to `/` on
`http://localhost:8080`, so no manual server or `baseURL` edit is needed.

The app is one self-contained HTML file, so a `file://` URL is fine for a quick manual
look (the `verify-*.js` / `verify-shots.cjs` harnesses do exactly that), just not for the
specs.

### Timing Issues
If tests are flaky:
- Make the action wait for the app state it should produce (the helpers no longer sleep)
- Add explicit waits for animations
- Use Playwright's auto-waiting features

### Element Selectors
If selectors break:
- Update `test-helpers.ts` with correct IDs/classes
- Use data-testid attributes in app (recommended)
- Check browser console for actual element structure

## Future Enhancements

- [ ] Visual regression testing with baselines
- [ ] Performance benchmarks
- [ ] Mobile viewport tests
- [ ] Accessibility audit integration
- [ ] Code coverage reporting
- [ ] Parallel test execution optimization

## Contributing

When adding new features to the app:
1. Write tests FIRST based on user intent
2. Describe what user is trying to accomplish
3. Test the experience, not the implementation
4. Update this README with new helper methods

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Test Plan](../PLAYWRIGHT_TEST_PLAN.md) - Full testing strategy

---

**Remember**: We're testing **user experience**, not code correctness. Every test should answer: "Does this work the way a user expects?"
