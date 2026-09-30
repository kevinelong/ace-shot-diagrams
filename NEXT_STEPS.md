# Next Steps — audited 2026-09-29

The plan of record for finishing up `ace-shot-diagrams`, and the audit trail behind it.

**How to keep this file honest.** An item is ticked only when a command's output backs it — the
command is named next to the tick. When an item here corresponds to one in an older plan
(`FEATURE_ROADMAP.md`, `PLAN.md`, `PLAN-two-phase-physics.md`, `PLAYWRIGHT_TEST_PLAN.md`,
`GAME_MODE_PLAN.md`, `UX_FIXES_PLAN.md`), tick it there too, in the same commit. Items that
need a human decision are marked **needs you** and stay unticked until then. Do not tick a
test green by relaxing the test — `verify-spin.js` below is the worked example.

---

## Done in this pass

- [x] **Re-embed the physics core.** `index.html` carried a build that no longer matched
      `ace-physics/` (75378 embedded vs 75365 built, differing inside the code sections).
      Backed by: `node verify-wasm-embed.js` → `ok: embedded core matches the current build`.
- [x] **Guard against that drift recurring.** `verify-wasm-embed.js` compares the embedded
      core against a fresh build with custom sections stripped (so build paths don't matter).
      Backed by: it failed before the fix (exit 1) and passes after.
- [x] **CI.** `.github/workflows/ci.yml`: pinned toolchain → build → `cargo test` → embed
      check → battery (judged by stdout, because the script aborts in teardown) and Playwright
      chromium with the report uploaded on failure.
- [x] **Reproducible toolchain.** `rust-toolchain.toml` pins rustc 1.96.0, because the embed
      check compares bytes and a different compiler produces different ones.
- [x] **LICENSE.** MIT, as already claimed by `Cargo.toml` and `package.json`.
- [x] **Duplicate screenshot removed.** `screenshot-kick.png` was md5-identical to
      `screenshot-english-diff.png` and referenced nowhere.
- [x] **Merged branch pruned.** `origin/physics-two-phase-friction` was fully merged.
- [x] **`kball-preset` merged.** It was the newest work in the repo (2026-08-16) and main had
      stopped 2026-07-07.
- [x] **Roadmap reconciled.** `FEATURE_ROADMAP.md` Phase 1 marked against the code.
- [x] **Dead npm script replaced.** `test:unit` pointed at `tests/unit/*`, which exist in no
      commit; replaced by `test:core`, which runs checks that actually exist.
- [x] **Playwright recording defaults.** `video`/`trace`/`screenshot` no longer record for
      every test across every project, and `shot-animation.spec.ts` opts back in to video
      because that artefact is its point. Backed by that spec's run: **14 passed, 1 flaky**
      (the video test, a fixed-wait test that passed on its retry; no spec asserts on
      artefacts, so nothing else could break). *That flake is gone — the wait was replaced by
      the app's own completion toast, see the fixed-waits item.* **Measured effect: the chromium suite went
      7.0 → 6.4 min.** Real, but small — the recording was not the bottleneck, and the plan's
      earlier claim that it was has been corrected in `playwright.config.ts` too.
- [x] **`playwright-core` pinned to the test runner's version**, so the repo installs one copy.
      Backed by: `npm install` → `playwright-core now 1.57.0` (`package-lock.json` updated).
- [x] **`verify-*.js` find a browser portably.** They hardcoded `/usr/bin/chromium`, so they
      could not run on Windows at all and behaved differently on CI. `CHROMIUM_PATH` still
      wins when set. Backed by, on Windows for the first time: `verify-consistency.js` 9/9
      (exit 0), `verify-animation.js` PASS (exit 0), `verify-ux-fixes.js` PASS (exit 0).
      The fourth, `verify-sim-make.js`, now runs but reports FAIL — see the open items.
- [x] **Golden trajectory regression.** `verify-trajectories.js` freezes the core's behaviour
      beyond "the intended ball potted": event sequences and final positions, with tolerances.
      Backed by: 7/7 on the clean tree, and **5/7** after perturbing one golden position by
      0.5 units and dropping one event — drift the outcome-only battery cannot see.
- [x] **Duplicate ids removed at the source: the retired `#palette-save` markup.** A migration
      moved the export/copy/save controls into `#palette-game` but left the old palette behind,
      so six ids (`btnCopyLink`, `btnExportPNG`, `btnExportSVG`, `saveDiagramName`,
      `btnSaveDiagram`, `savedDiagramsList`) existed twice and `getElementById` picked whichever
      came first. Deleted the stale palette — guarded so that **every id in the deleted block is
      proven to exist elsewhere** (all six live on in `#palette-game`). Backed by: duplicate ids
      **none**; all six widgets still present and reachable; `#palette-aids` untouched.
- [x] **The migrated controls are styled again.** Their CSS still targeted `#palette-save`, so
      the live copies in `#palette-game` rendered as default browser buttons. Repointed to
      `#palette-game`. Backed by: computed `6px` radius and theme background, was `0px`/grey.
- [x] **Re-verified the widgets end to end after the deletion** (they are the reason the old
      markup could not simply be dropped): Export PNG downloads `shot-diagram.png`; Copy Link
      fills the clipboard with the `#v1|…` share string; typing a name and clicking Save lists
      the entry under `#savedDiagramsList`; Aids toggles still drive their checkbox; the legend
      element and its CSS are untouched (still `display: none` by default, as shipped).
- [x] **Stale palette wiring removed**: the dead share-palette close/restore/drag block (it
      looked up `palette-share`, an id the app never had), the retired `save:` registry entry,
      the `restore-share` button, and a tour step retargeted from the deleted `#palette-save`
      to `#palette-game`.
- [x] **Roadmap 1.4 "Natural Angle Line" is not an open feature — it ships as the Follow-Line
      aid.** The audit marked it open because it searched for the literal name `naturalAngle`;
      the capability is `followAngleDeg = 30 * Math.cos(cutAngle)` (`index.html:8383`), toggled
      as **"Follow Line (top)"** in the Aids palette. Backed by: driven through the UI at a 19.6°
      cut, the drawn line sits **28.23°** off the tangent against the formula's **28.26°**; both
      aid lines render (`STOP`/`FOLLOW` labels) with **0 page errors**; `verify-consistency.js`
      **9/9** and the wasm embed check still pass. A code comment now names the 30° rule so the
      next audit cannot miss it the same way.
- [x] **The app's own in-browser suite is green: 40/40** (was 39 passed / 1 failed). The failing
      test asserted a `palette-share` id that never existed; it now asserts the seven palettes
      the app actually ships (balls, cue, game, shot, legend, aids, actions) — measured, not assumed.

## Retracted findings (my measurements, not the app's bugs)

Three findings from the review pass were **wrong**, and the plan of record should say so:

- **"The spin-type label is invisible at 0.13px."** False. `#spinTypeInner` is an SVG
  `<text font-size="0.13">` in the cue wheel's own coordinates, where its siblings use
  `0.09`–`0.12`; it renders at roughly 18px. The pixel heuristic read SVG *user units* as CSS
  pixels. No fix applied, nothing to fix.
- **"Export PNG/SVG, Copy Link and Save are unreachable."** False. Those controls live in the
  `🎮 Game` palette, which starts minimized; clicking Export PNG there downloads
  `shot-diagram.png` before any of this work. The claim came from reading `visibleAt: []` at
  startup without expanding the palette. The real (smaller) defect was the duplicate ids plus
  the lost styling, both fixed above.
- **"`palette-aids` is referenced but never produced."** False. `#palette-aids` is in the
  markup ("Position aid toggles", minimized by default) and its wiring works: the spec's
  per-resolution Aids tests pass. The earlier probe read the DOM before the panel existed.

Process note for the next audit: query the runtime DOM **after** expanding the panel, and never
conclude "unreachable" or "missing" from a hidden container's visibility alone. Call a feature "open" only when its *behaviour* is absent — roadmap 1.4
was open only because the identifier `naturalAngle` never existed.


## App findings measured while removing the test sleeps

- **Shoot is silently ignored for up to ~1 s after load.** `executeShot()` returns without a
  word when `ballPositions['ghost']` is not yet computed; the button is never disabled and the
  toast says "Click Shoot to break!" while clicks do nothing. Measured: ghost element visible
  at ~70 ms, first accepted click between ~550 ms and ~940 ms, varying per run. A disabled
  state (or the existing "No aim point" message) for that window would make the UI honest;
  the spec side now retries, so this is a product question, not a test one.
- **The app writes to the clipboard on load.** The first toast after `goto('/')` is
  "Link copied to clipboard!" - the share URL is copied without the user asking. Recorded for
  a decision: keep it (share-first UX) or make it an explicit action.

## Needs you (blocked on a decision, credentials, or a remote write)

- [ ] **Push the commits.** 11 un-pushed as of 2026-09-29 (`git log origin/main..main --oneline`);
      the figure is stale the moment it is written, so re-measure before acting. The public demo
      at <https://kevinelong.github.io/ace-shot-diagrams/> serves `index.html` from `main`, so it
      is running the *stale* core and still carries the duplicate-id bug: `origin/main`'s
      `index.html` differs from the working tree by **+109/-146** lines. Pushing is what fixes the
      live tool. `git push origin main`
- [ ] **Release + discovery.** No tags exist at all (`git tag` is empty) and the repo's homepage
      field is unset, so the deployed demo is undiscoverable from the repo. No version number
      has ever been chosen (there are no tags), so that name is yours to pick;
      `git tag -a vX.Y.Z -m "..." && git push origin vX.Y.Z` once you have, plus
      `git push origin --delete <branch>` for the merged branches.
- [x] **A trustworthy exit code for the battery.** `verify-rust-parity.js` prints its verdict
      and then aborts in teardown (exit 3221226505 = 0xC0000409); `verify-core.js` judges what
      each wasm check printed (the battery and the trajectory golden), and CI plus
      `npm run test:core` go through it. Backed by:
      `npm run test:core` → `ok: battery 8/8`, **exit 0**.
- [ ] **Make the Shoot button honest for its dead window.** For up to ~1 s after load the app
      ignores Shoot clicks completely - no disabled state, no message - while the toast reads
      "Click Shoot to break!" (measured; see the app findings below). Two small options: disable
      `#btnShoot` until `ballPositions['ghost']` exists, or route that case into the existing
      "⚠️ No aim point - position cue ball to aim" message. The specs no longer depend on which
      you pick (they retry), so this is purely a UX call.
- [ ] **Two harnesses report FAIL** (both runnable now, neither blocked by portability):
      `verify-spin.js` and `verify-sim-make.js`, while `verify-consistency.js` (9/9),
      `verify-animation.js` (PASS), `verify-ux-fixes.js` (PASS), the battery (8/8) and the
      Playwright suite (158/158) are green. Decide per harness whether the model or the
      harness is wrong — and fix that side, never the assertion.
- [ ] **`verify-spin.js` semantics.** Red on a clean clone, and it must not be made green by
      relaxing it. Measured through the core at the script's own setup (contact x≈42.8):
      english 0.4 → cue ends 44.3, 0.5 → 44.0, 0.6 → 42.8, 0.7 → 41.0, so its `draw < contact−3`
      clause needs more english than it uses; and a `spin` event fires for *every* english
      including center ball, so its `!sSpin` clause cannot hold. Decide whether the event means
      "english applied" or "slide→roll transition", then align the model's event or the script.
- [ ] **Two engines.** The Rust core plus a JS fixed-timestep fallback whose mirroring is
      deferred (`PLAN-two-phase-physics.md` item D). Keep both with parity in CI, or drop the
      fallback now that wasm is universal.
- [ ] **Three unmerged branches, all with content:** `lineart-print-tooling` (+120 lines,
      improves an existing main script — merge candidate), `claude/calendar-ascii-pro-design-een0rn`
      (497 lines, a Columbia Cue Club calendar generator), and
      `claude/recent-changes-review-wurocf` (972 lines including a 226-line tournament-platform
      spec, which pairs with the merged `scoresheet.html` and the separate `15ball-scoresheet` repo).
- [ ] **Two plan docs are unmaintained:** `PLAYWRIGHT_TEST_PLAN.md` has 137 unticked boxes and
      `GAME_MODE_PLAN.md` 29, against a suite that is green. Either reconcile them against the
      specs or prune them and say the specs are the source of truth.
- [x] **Fixed waits are the runtime and the flakiness.** 92 `waitForTimeout` calls totalling
      **57.6 s per pass** -> **4 calls, all deliberate** (see below). Backed by the full suite:
      **158 passed, 0 flaky, 41.7 s** (was 57.1 s with 1 flaky).
  - [x] **`shot-animation.spec.ts` converted — 15 waits / 32.3 s removed, 0 left** (the top
        offender and the file that flaked). Backed by `--repeat-each=4`: **60/60 passed, 0
        flaky, 41.8 s** (≈10.4 s per pass of 15 tests), against 32.3 s of sleeps per pass
        before. What the sleeps were really waiting for, measured through the app: it accepts
        a shot only once its ghost-ball aim exists, which lands **~100–900 ms after load,
        varying per run**, and it says nothing while refusing - no disabled state, no toast,
        no class - so a fixed sleep was both slower than needed and the flake. The spec now
        clicks until the app itself reports `Shot in progress` (`shootAndAwaitStart`), waits
        for its result toast (`waitForShotComplete`), and asserts setup-dependent values by
        polling (`toHaveValue` / `toContainText` / `toHaveAttribute`) instead of reading once.
  - [x] Dead check removed with it: the "button might not be clickable while animating"
        branch never ran - `#btnShoot` is never disabled (measured across a shot's whole
        animation).
  - [x] **`palette-minimize.spec.ts` converted — 13 waits removed** (the file that flaked twice
        on 2026-09-29). Sleeps in front of polling assertions are gone; the ones guarding reads
        or screenshots now wait for the state they were guessing at (the palette body
        collapsing/expanding, the racked cue ball's `on-table` class). Backed by
        `--repeat-each=2`: **151/152 passed, 1 retry-passed flake, 42 s**, against the same
        command on the previous revision (**149/152 with 2 flaky and a hard failure, 72 s**).
  - [x] **The shared navigation sleeps and the read-once races.** `test-helpers.ts`'s
        `gotoEmpty`/`gotoWithRack` sleeps are now the board-visible wait (most critical-path
        specs go through them); the three visibility races in `02-pocket-selection` use
        `expect.poll`; `power-control` polls the force display; two sleeps left
        `quick-validation`. Backed by those four specs at `--repeat-each=2`: **62 passed,
        STATUS passed**.
  - [x] **The read-race files converted: `02-pocket-selection` + `03-shot-calculation` (22
        waits).** Their sleeps sat in front of reads (`getCutAngle()`, `getSelectedPocket()`,
        `textContent()`/`boundingBox()`) that raced the app's recalculation, so they became
        polling assertions (`expect.poll`), and "the angle changed" now polls *until* it
        changes - which is the assertion. Also repaired a **vacuous assertion** found there: the
        "impossible shot" test's `statusMessage !== null` is always true because `textContent()`
        returns `''`, not null; it now requires a status message or the target line. Backed by
        `--repeat-each=2`: **44 passed, STATUS passed, 17.1 s**.
  - [x] **`shot-animation`'s consecutive-shots test had a broken premise** (found because the
        new waits refused to sleep through it): it clicked Shoot three times and only checked the
        toast never said "Error" - which passed even when the app refused the shot, e.g. after a
        shot pockets the cue ball and the app answers "Place cue ball on table first". It now
        requires the app to answer every click (shot start or a warning). Backed by
        `--repeat-each=8`: **8/8 passed in 3.5 s**.
  - [x] **The last six files** (`rack-start` 10, `kick-shots` 7, `quick-validation` 6,
        `mobile` 3, `01-ball-placement` 1, `power-control` 1): post-goto sleeps became the
        racked cue ball's `on-table` class (or the board being visible on `?empty=1`), the
        post-shot ones use the shared `shootAndWait`, the post-Rack one waits for the "Rack set"
        toast, the palette ones wait for the collapse they act on, and value reads poll. The
        shot helpers now live in `tests/setup/test-helpers.ts` so specs share them. Backed by
        those six files at `--repeat-each=2`: **76 passed, STATUS passed, 19.7 s**.
  - **Kept on purpose (4 calls):** the three 50 ms gaps in "should recalculate instantly
        without lag" - they *are* the measurement - and `test-helpers.waitForShotCalculation`,
        which stays a 300 ms wait until the app exposes a signal for "shot calculated".
  - **Found and recorded, not fixed here:** `kick-shots.spec.ts` has **three** assertions of the
        form `expect(count).toBeGreaterThanOrEqual(0)` (`:63` mirror overlay, `:74` incoming-angle
        arc, `:116` kick aim label) that cannot fail — they claim coverage of optional features
        while asserting nothing. What those features should guarantee is a product call, so they
        are left as they are and listed here.
  - Per-test boot of the 552 KB page is the other cost.
- [ ] **Remaining doc drift:** `tests/README.md`'s test tree and its "file:// is the default"
      claim; `claude.md`'s v008 (v009 is tracked) and its "`cargo test` needs MSVC" note (it
      runs here); the Playwright config comment's "76/76" (the suite is 158); the roadmap's
      anti-feature "Video Recording/Playback" next to shipped `record-video.cjs`.
- [ ] **Bigger bets:** split the 552 KB inline app into modules with a build that still emits
      one self-contained file (the pattern already used in the Go project); publish the
      zero-dependency physics core as a crate so other tools can reuse it.

## Reference: what the last audit measured

- Playwright **chromium 158/158** green after the waits cleanup, **0 flaky, 41.7 s**
  (from 158/158 with 1-2 flaky and 57.1 s). Fixed waits in the suite: **92 -> 4**,
  the four remaining being deliberate (three timing gaps that are the measurement,
  one helper awaiting an app signal). The app's own in-browser suite is
  **40/40**, page errors **0**, duplicate ids **none**.
- Core: **build 0.43 s**, `cargo test` **5/5**, battery **8/8**.
- The browser `verify-*.js` scripts run on Windows now (portable browser lookup): `verify-consistency` 9/9, `verify-animation` PASS, `verify-ux-fixes` PASS; `verify-spin` and `verify-sim-make` report FAIL - see the open items.
- Files: 77 tracked, 86 commits; `index.html` 552 KB with ~100 KB of embedded wasm.
