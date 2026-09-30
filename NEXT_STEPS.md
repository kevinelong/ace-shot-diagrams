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
      *(Correction 2026-09-29: that fix covered the `verify-*.js` family only. `verify-shots.cjs`
      and the three `record-*.cjs` harnesses still passed a hardcoded
      `/usr/bin/chromium-browser`, so they could not run here at all. Now fixed the same way —
      `CHROMIUM_PATH` wins, otherwise `executablePath` is omitted and playwright-core resolves
      its own browser — and `verify-shots.cjs` runs on Windows: **6/6 shots potted as intended**
      (direct cuts, banks, kick, combo; right pocket, no scratch, 0 errors).)*
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
- [x] **Fixed waits are the runtime and the flakiness.** 92 `waitForTimeout` calls totalling
  - [x] **`shot-animation.spec.ts` converted - 15 waits / 32.3 s removed, 0 left** (the top
        offender and the file that flaked): `--repeat-each=4` gave **60/60 passed, 0 flaky**,
        41.8 s (~10.4 s per pass of 15 tests) against 32.3 s of sleeps per pass before. The sleeps
        were hiding a race: the app accepts a shot only once its ghost-ball aim exists (~100-900 ms
        after load, varying per run) and refuses silently, so the spec now clicks until the app
        reports `Shot in progress` and waits for its result toast.
  - [x] **`palette-minimize.spec.ts` converted - 13 waits removed** (the file that flaked twice on
        2026-09-29): `--repeat-each=2` gave **151/152 passed, 1 retry-passed flake, 42 s** against
        the same command on the previous revision: **149/152 with 2 flaky and a hard failure,
        72 s**. `--repeat-each=3` afterwards: **224 passed** (18.5 s per pass vs 38.9 s).
      **57.6 s per pass** -> **3 calls, all deliberate** (see below). Backed by the full suite:
      **158 passed, 0 flaky, 39.4 s** (was 57.1 s with 1 flaky). The count covers
      `waitForTimeout` in the specs; the helpers' hidden per-action sleeps are gone too.
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
        The "minimize all" test still occasionally needs its retry under parallel load (its six
        collapses are now awaited one by one, so it is no longer a hard failure); every other
        flake in this file is gone.
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
  - **Kept on purpose (3 calls):** the three 50 ms gaps in "should recalculate instantly
        without lag" - they *are* the measurement. `test-helpers.waitForShotCalculation` is gone
        (its callers wait on the app's state instead).
  - **Found and recorded, not fixed here:** `kick-shots.spec.ts` has **three** assertions of the
        form `expect(count).toBeGreaterThanOrEqual(0)` (`:63` mirror overlay, `:74` incoming-angle
        arc, `:116` kick aim label) that cannot fail — they claim coverage of optional features
        while asserting nothing. What those features should guarantee is a product call, so they
        are left as they are and listed here.
  - [x] **The bigger half of the fixed cost was inside `test-helpers.ts`'s actions - now gone.**
        Seven methods (`dragBallToTable`, `selectObjectBall`, `selectPocket`, `setEnglish`,
        `setPower`, `enableKickSolver`, `setGameMode`) each called a shared 300 ms sleep right
        after driving the app's `DEBUG` API, so every place/select/set paid it (~1.2 s per
        critical-path test). They now wait for their own effect in the app's own state
        (`DEBUG.state().ballPositions/selectedBallId/selectedPocket/solver`, the force display,
        the contact point), and the shared sleep is deleted. Backed by the full suite:
        **158 passed, 0 flaky, 39.4 s** (41.7 s before this change).
  - [x] **The sleep was hiding a second silent-refusal window** (found because the new waits
        refused to sleep through it): the app ignores `DEBUG.placeBall`/`selectBall`/
        `selectPocket` until its initial setup completes - the same ~100-900 ms window in which
        it ignores the Shoot button - and reports nothing. The polls failed with exactly that
        ("1 should land at 65,30", "corner-br should be the selected pocket"). The helpers now
        *retry the action until the app's state reflects it* (`actUntilApplied`), which is
        deterministic and fails loudly with the last observed state if it never applies.
  - [x] `setEnglish` gets **no** wait: `DEBUG.state()` carries no english field, and the contact
        point is a rendering effect (it moves in `cx` for side english, `cy` for top/bottom), so
        polling it was both wrong for side english and a flake source. Callers assert the effect
        they care about, by polling (`english-controls`' six label reads became `toContainText`
        polls, its contact-point read an `expect.poll`).
  - [x] The app's break preset (follow spin, power 7) lands *after* load and overwrote values
        tests had just set once the helpers got faster. `gotoWithRack` (and the two specs that
        navigate themselves) now wait for the preset itself - the app saying "setup done" -
        before the test body runs.
  - Per-test boot of the 552 KB page is the other cost.

- [x] **The dead weight the engine cutover orphaned is gone.** Eight functions that appeared
      exactly once - definition only, referenced nowhere in the repo - plus the break-state block
      and `frozenRackPending` write that nothing read: `updateMakeProbability` (a legacy duplicate
      of the live make-% updater), `checkShotRailCollisions`, `setupDemoShot`, `isDirectPathClear`,
      `getBlockingBalls`, `calculateReflectionAngle`, `calculateActualKickDestination`,
      `findLegalCombinationShots`. `index.html`: **10586 -> 10317** (and 11174 before the engine
      cutover). `calculateMakeProbability` was kept - the app's own self-test asserts on it.
      Backed by `verify-consistency.js` 9/9, `verify-shots.cjs` **6/6 shots potted as intended**,
      and the full suite.
- [x] **Doc drift, all four fixed.** `tests/README.md`'s tree now matches the twelve real files
      and its protocol section states what the config does (the suite always runs against
      `npx http-server -p 8080`; `file://` is for the standalone harnesses, not the specs);
      `claude.md` says v009 and no longer claims `cargo test` needs MSVC (it runs here);
      `playwright.config.ts`'s comment no longer says "76/76" (the suite is 158); the roadmap's
      "Video Recording/Playback" anti-feature now distinguishes the declined in-app feature from
      the shipped recording tooling.

- [x] **The app's own in-browser suite is green: 40/40** (was 39 passed / 1 failed). The failing
      test asserted a `palette-share` id that never existed; it now asserts the seven palettes
      the app actually ships (balls, cue, game, shot, legend, aids, actions) — measured, not assumed.

- [x] **The three `kick-shots` tautologies are gone** (decided: delete the two with no contract,
      make the third real). The mirror-overlay and incoming-angle-arc tests asserted `count >= 0`,
      which cannot fail, and are deleted - both elements *do* exist in the markup, so those two
      aids now have **no coverage**; asserting them needs someone to say what they must guarantee.
      The kick-aim-label test asserts `toBeVisible()` - real markup the app writes
      (`index.html:5849/5889`), which the sibling indicator test proves is showing. Backed by that
      file at `--repeat-each=3`: **18 passed, 0 flaky**.
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
- **RETRACTED: "the app writes to the clipboard on load."** False, and my error: the toast
  element *ships* with the text "Link copied to clipboard!" in its markup (`index.html:3216`), so
  reading it before the app updates it - which is what my probe did - is not evidence of a copy.
  Measured properly: the clipboard is **empty** at load, and `navigator.clipboard.writeText` is
  reached only from `copyShareLink()` (`index.html:7523`). Nothing to change - "copy only when the
  user asks" was already the behaviour. Fourth instance of the same mistake: reading static
  DOM/markup as runtime behaviour.
## Next up (decided, not started)

- [ ] **Roadmap 2.2, safety-shot mode** - decided 2026-09-29: Phase 2 starts here, built in the
      current single-file app (the user chose "keep the single file, build 2.2 now" over
      modularising first, with the note that 2+ more features this quarter would flip that).
      Scope per `FEATURE_ROADMAP.md` 2.2: snooker zones and optimal defensive positions, ~6-8 h,
      HIGH value. Nothing exists yet (`snooker`/`safetyZone` have no hits in `index.html`).
- [ ] **A verdict on `verify-sim-make.js`** - the second red harness. My decision menu covered
      `verify-spin.js` only (answered: the `spin` event means slide->roll, so the model's emission
      gets fixed and the script stands); this one still needs the same model-vs-harness call, and
      I owe it with measurements rather than a guess.


## Needs you (blocked on a decision, credentials, or a remote write)

- [x] **Push the commits - done, and the live tool is fixed.** All of it is on `main` (0
      un-pushed) and the Pages demo was re-checked after the rebuild: the old `#palette-save`
      markup marker is gone and the new build is being served, so the live tool has the corrected
      core, the palette fix and the single engine.
- [x] **Release + discovery - done.** **v1.0.0** tagged and pushed (annotated: what ships, the
      verified numbers, the two known-red harnesses); the repo homepage set to the demo URL and
      verified through the API; the two merged remote branches (`kball-preset`,
      `lineart-print-tooling`) deleted. Remote holds `main` plus the two out-of-scope `claude/*`
      branches, recorded as such above.
- [x] **A trustworthy exit code for the battery.** `verify-rust-parity.js` prints its verdict
      and then aborts in teardown (exit 3221226505 = 0xC0000409); `verify-core.js` judges what
      each wasm check printed (the battery and the trajectory golden), and CI plus
      `npm run test:core` go through it. Backed by:
      `npm run test:core` → `ok: battery 8/8`, **exit 0**.
- [x] **The startup window is gone - no app change needed.** Re-measured after the engine
      cutover: clicks at **300 ms and 600 ms** are all accepted (`executeShot() called` ->
      "Shot in progress", 4/4), where the same probe measured silent refusals at ~550 ms before
      it. So the window belonged to the JS stepper's setup path, not to the core. The spec-side
      retry stays as belt and braces (it is deterministic and costs nothing when the app is
      ready). Original wording kept below, and the DEBUG half is moot for the same reason.
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
- [x] **Two engines -> one. Decision (user, 2026-09-29): drop the JS fallback, keep the seam.**
      `executeShot` now resolves through the core or **refuses the shot with a message**; it no
      longer silently plays back a different physics model (the fallback was a single-`FRICTION`
      approximation of the two-phase model, so "falling back" meant simulating a different game).
      Removed with it, in one pass: the JS stepper (`animateShot`) and its accumulator state, the
      269-line legacy break-animation block the repo itself had marked "DEAD CODE … safe to
      delete", and the JS shot-model guts it was the only caller of (`stepShotPhysics` 48 lines,
      `checkShotCollisions` 142, `applyFrozenRackBreakPhysics` 77, `renderShotBalls` 20) plus the
      constants only they used. `index.html`: **11174 -> 10579 lines**. The seam is intact -
      `computeShotPlan`, the Rust-core hooks and `window.ACE_SHOT` are unchanged, so re-adding an
      engine stays a contained job. Backed by `verify-consistency.js` **9/9** (it clicks Shoot,
      i.e. the break, which now resolves through the core) and the full Playwright suite.
      `PLAN-two-phase-physics.md` item D is **closed** - there is no JS stepper left to mirror.
  - Follow-ups recorded: `breakBallStates` / `frozenRackPending` are now written by the shot
      setup and read by nothing (kept declared so the writes stay in scope); and the same
      "no callers left?" sweep should be run once more over the shot-animation helpers now that
      the stepper is gone.
- [x] **The unmerged branches, decided and executed.** `lineart-print-tooling` is **merged**
      (`49c60d2`, tooling only: refinements to `svg-to-lineart.js` plus the new
      `extend-aim-to-rail.js`, `measure-labels.js` and `scenarios/iso-cutout.json`; all three
      scripts parse). `claude/recent-changes-review-wurocf` (`aceshot/`, 972 lines - a tournament
      platform snapshot + spec docs) and `claude/calendar-ascii-pro-design-een0rn` (`calendar/`,
      497 lines - a club calendar generator) are **out of scope for this repo**: neither touches
      `index.html`, the tests or the tooling, and each is a separate artifact. They stay as
      branches, recorded here so the next audit does not re-open it. If either should become its
      own repo, say so and I'll extract it.

## Reference: what the last audit measured

- Playwright **chromium 158/158** green after the waits cleanup, **0 flaky, 39.4 s**
  (from 158/158 with 1-2 flaky and 57.1 s). Fixed waits in the suite: **92 -> 3**, the
  three remaining being the timing gaps that *are* the "recalculate instantly" measurement;
  the helpers' hidden per-action sleeps are gone as well. The app's own in-browser suite is
  **40/40**, page errors **0**, duplicate ids **none**.
- Core: **build 0.43 s**, `cargo test` **5/5**, battery **8/8**.
- The browser `verify-*.js` scripts run on Windows now (portable browser lookup): `verify-consistency` 9/9, `verify-animation` PASS, `verify-ux-fixes` PASS; `verify-spin` and `verify-sim-make` report FAIL - see the open items.
- Files: 77 tracked; `index.html` **10585 lines / 516 KB** with ~100 KB of embedded wasm
  (was 11174 / 552 KB: the JS fallback and its dead neighbours went).
