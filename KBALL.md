# K-Ball (15-Ball Rotation) \u2014 Columbia Cue Club

This branch adds a canonical **K-Ball** preset to ACE Shot Diagrams so the app can be used as a headless renderer for a rules-and-scoresheet demonstration video.

## What's included

| Piece | Purpose |
|-------|---------|
| `GAME_MODES.KBALL` in `index.html` | Rotation rules, call-pocket required, no-safety flag, ball-in-hand-anywhere miss penalty, target-score metadata (25 rec / 35 pro). |
| K-Ball rack branch in `generateRackPositions()` | Deterministic 15-ball layout with 1 at apex, 15 at back-center. Same coordinate system as the 8-ball preset. |
| K-Ball option in both game-mode `<select>` dropdowns | Selectable from the UI. |
| `kball-scenarios.json` | Nine scenes \u2014 one per rule on the Columbia Cue Club rules sheet. Each scene has a URL-hash state, voiceover script, duration, and annotations. |
| `record-video.cjs` | Playwright + ffmpeg pipeline that walks the scenarios file, renders deterministic PNG frames using the app's virtualized rAF, overlays annotations from the JSON, adds scene-title text via ffmpeg drawtext, and concatenates a single mp4. |
| `scoresheet.html` | Zero-dependency companion score sheet mirroring the Columbia Cue Club paper design. Click balls to record pockets, save/load/export to localStorage or JSON, print-ready CSS. Screen-record it as part of the video. |

## Producing the video

```bash
# 1. Preview each scene interactively in a browser:
#    open index.html and pick "K-Ball" from the Game dropdown. Each scenario
#    URL from kball-scenarios.json can be pasted as an index.html#... hash.

# 2. Render all nine scenes as a single narrated video (no voice track yet):
npm install
node record-video.cjs
# -> out/kball-full.mp4

# 3. Render just one scene while iterating on it:
SCENE=03-break-results node record-video.cjs

# 4. Record the score-sheet demonstration separately in Camtasia / OBS with
#    scoresheet.html open in a browser. Fill in a sample rack live to show
#    each field.

# 5. In Camtasia (or your NLE): drop kball-full.mp4 in, add voiceover per
#    scene using the "voiceover" field in kball-scenarios.json as your script,
#    then paste in the scoresheet screencap section between the Scoring and
#    Continuing scenes. Add an intro/outro card.
```

## Recommended production stack (Aug 2026)

- **Diagrams / animations:** this repo, headless via `record-video.cjs`.
- **Score sheet:** screen-record `scoresheet.html` in Camtasia 2026 (Smart Focus auto-zoom does per-cell zoom automatically as you click).
- **Voiceover:** record yourself (~3 minutes total) or use ElevenLabs.
- **Intro/outro card only:** Google Veo 3.1 or Kling 3.0 \u2014 a 5-second animated title card is where AI video adds value.
- **Real footage of a break/rack (optional B-roll):** phone or GoPro on a boom directly above center of the table, 90\u00b0 down. Follow [the overhead pool video guide](https://www.youtube.com/watch?v=2HH59U3F-1U).

## Scenario coverage

The nine scenes map 1-to-1 onto the rules sheet:

1. The Rack
2. Legal Break
3. Break Results
4. Rotation & Calling Pockets
5. Miss Penalty
6. No Safety Play
7. Scoring
8. Continuing the Game
9. Finishing the Game

Each has a matching `voiceover` string that can be used as-is for narration, in on-screen captions, or fed to a TTS engine.

## Rack convention used

The rules poster on the wall calls for stripes and solids alternated. Even though the game is called *15-Ball Rotation*, the **8-ball anchors the geometric center of the rack** (standard 8-ball racking discipline). The canonical layout is:

- **1** at apex (head ball on the foot spot)
- **8** in the geometric center of the rack (row 2 middle)
- **15** at back-center (back row middle)
- **6** and **14** at the two back-row corners (one solid, one stripe)
- Remaining balls alternate solids and stripes down the rack

If your club uses a slightly different arrangement, edit the `kballLayout` array in `generateRackPositions()` and re-run `record-video.cjs`. All scenarios reference balls by number, so they still play out correctly.

## Not covered here (deliberate)

- Live in-app playback of the video (the app roadmap explicitly opts out of playback). `record-video.cjs` is offline only.
- Real-time score-sheet networking / multiplayer. Save/load is local-only per the app's URL-and-localStorage philosophy.
- Automated voiceover generation. Add it via your NLE.
