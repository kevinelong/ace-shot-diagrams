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
- **RETRACTED: "the app writes to the clipboard on load."** False, and my error: the toast
  element *ships* with the text "Link copied to clipboard!" in its markup (`index.html:3216`), so
  reading it before the app updates it - which is what my probe did - is not evidence of a copy.
  Measured properly: the clipboard is **empty** at load, and `navigator.clipboard.writeText` is
  reached only from `copyShareLink()` (`index.html:7523`). Nothing to change - "copy only when the
  user asks" was already the behaviour. Fourth instance of the same mistake: reading static
  DOM/markup as runtime behaviour.
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
- [ ] **Make the app honest for its startup window (Shoot *and* the DEBUG API).** The same
      ~100-900 ms window swallows `DEBUG.placeBall`/`selectBall`/`selectPocket` as well. The
      specs handle both now (retry until the app's state reflects it), so this is a product
      question, not a test one. Original wording below.
- [x] **The startup window is gone - no app change needed.** Re-measured after the engine
      cutover: clicks at **300 ms and 600 ms** are all accepted (`executeShot() called` ->
      "Shot in progress", 4/4), where the same probe measured silent refusals at ~550 ms before
      it. So the window belonged to the JS stepper's setup path, not to the core. The spec-side
      retry stays as belt and braces (it is deterministic and costs nothing when the app is
      ready). Original wording kept below, and the DEBUG half is moot for the same reason.
- [ ] **Make the app honest for its startup window (Shoot *and* the DEBUG API).**
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
