# SPEC: Pool Tournament Platform — MVP → Parity → Beyond

A phased product specification for a pool/billiards tournament management
platform that replaces Challonge, DigitalPool, and CompuSport for its target
users. Grounded in the verified market research in
`RESEARCH_pool_tournament_market_2026_07.md` (July 2026).

---

## 1. Vision

**The tournament platform players don't hate.** Every incumbent optimizes for
the organizer and treats players as a monetization surface (CompuSport: 2.3★
iOS, pay-gated match-call notifications, ads shown to paying entrants) or as an
afterthought (DigitalPool: buggy new apps with ~5K installs). The wedge:

> **Players never pay, never see ads, and always know when they're up.
> Organizers get a bracket engine they can trust more than paper.**

## 2. Target users, in priority order

1. **Tournament directors (TDs)** of weekly bar-box events, 8–64 players —
   the beachhead. They run chip events and double elim on paper or on tools
   they distrust; they decide what software a room uses.
2. **Players** — the growth loop. Every tournament exposes 8–256 players to
   the product; a player app people actually like is the market's largest
   unfilled niche.
3. **Venue operators / promoters** — recurring series, multiple tables,
   payouts, streaming (Phase 2+).
4. **League operators** — divisions, sessions, team formats (Phase 3; this is
   CompuSport/FargoRate LMS territory and requires institutional patience).
5. **Spectators / streamers** — public brackets, live scores, OBS overlays.

## 3. Product principles (derived from research)

| # | Principle | Evidence |
|---|---|---|
| P1 | **Players are never the revenue source.** No ads, no IAP, free push notifications, forever. | CompuSport's most resented behaviors are pay-gated match calls and ads for paying entrants. |
| P2 | **The bracket engine must beat paper.** Deterministic, matching traditional pool bracket charts, property-tested; a TD must never have to recreate an event because the finals didn't converge. | DigitalPool finals-convergence bug; Challonge's paper-mismatched loser routing. |
| P3 | **Mobile-first, offline-tolerant, fast.** Score entry must work on a bar phone with bad Wi-Fi and propagate in under a second on good networks. | 10s iPad scoring lag (DP); "constantly freezes" (CompuSport); "isn't formatted for mobile devices" (DP iOS). |
| P4 | **Zero-friction participation.** Scoring and viewing must work without creating an account. | DP's account-less live scoring is its best-loved trait; keep and extend it. |
| P5 | **Format completeness is a feature, not a roadmap.** Ship round robin and chip variants at launch — the leader still labels them "Coming Soon" in mid-2026. | DP format gaps [2-1 verified]. |
| P6 | **Fargo integration is table stakes (US), not a differentiator.** Plan for it early; treat API access as a named risk. | DP's deep integration sets the bar; access terms unknown. |
| P7 | **Simple, transparent organizer pricing.** One comprehensible model; generous free tier; never move a previously free feature behind a paywall. | "DP no longer free" backlash; CompuSport "pay twice" complaints. |

## 4. Phase 0 — MVP: run a real Tuesday-night tournament end to end

**Goal:** a TD runs a 32-player chip or double-elim bar tournament start to
finish, faster than paper, with zero player complaints about not hearing their
match called. **Everything in this phase is free.**

### 4.1 Tournament engine (the core asset)

- **Formats at launch:** single elimination, double elimination, round robin,
  chip tournament (fixed-chip and play-the-field variants).
- Double elimination options TDs actually use: true double (bracket reset),
  single-elim finals (must converge — regression-test the exact DP failure),
  loser-side handicaps/races differing from winner side.
- **Paper-chart fidelity:** loser-side drop patterns match standard printed
  pool brackets (the charts sold in billiard supply catalogs); seeded positions
  and bye placement follow the same conventions. Publish the drop charts in
  docs so TDs can verify.
- Races configurable per stage (e.g., races to 5/4, winners 5 – losers 3).
- Mid-tournament edits with audit log: add/remove/swap players, re-seed before
  a round locks, forfeit/no-show handling, table reassignment.
- **Engine quality bar:** pure, deterministic core module; property-based
  tests (every bracket size 3–256: exactly one champion, correct match count,
  no player scheduled twice simultaneously, finals always converge); golden
  files against published paper charts for 8/16/32/64.

### 4.2 Tournament-day operations (TD web app, tablet-friendly)

- Create tournament in <2 minutes: format, race, entry fee, tables.
- Registration: pre-register via link, walk-up add, check-in toggle.
- Seeding: random draw (animated, auditable), manual, rating-sorted.
- Table management: assign matches to tables; queue of "up next".
- **Match callouts:** when a match is assigned a table, both players are
  notified (see 4.4) and it appears on the public board.
- Payout calculator: configurable splits from entry fees, house add, side pots.
- One-tap score entry for the TD as fallback for everything below.

### 4.3 Live scoring (player/table surface — no account required)

- Per-table QR code → score-entry page (PWA) for that match. Large +/- rack
  buttons, race progress, "I won" submission with opponent/TD confirm option.
- **Offline-tolerant:** score entry queues locally and syncs on reconnect;
  optimistic UI; target <500ms propagation to bracket views on good networks.
- Anti-abuse basics: per-table token, TD can lock/correct any score (audited).

### 4.4 Player experience (PWA first, app stores later)

- Public tournament page: live bracket, chip counts/standings, table board,
  results — readable on a phone (this is where every incumbent fails).
- **Free match notifications:** web push ("You're up on table 3 vs. Dana") on
  claim of a bracket slot via magic link — no account, no payment, no ads. This
  single feature attacks CompuSport's worst reviews.
- Optional lightweight account (phone/email) to keep history across events.

### 4.5 Explicitly out of MVP scope

Native iOS/Android apps, payments/registration fees, FargoRate integration,
leagues/divisions/teams, streaming overlays, multi-stage formats, discovery.
Each is deliberately deferred — see phases below.

### 4.6 MVP non-functional requirements

- Mobile-responsive throughout; PWA installable; works on 3-year-old phones.
- Real-time via websockets/SSE with polling fallback.
- Uptime story honest for bar Wi-Fi: everything read-only cacheable; scoring
  queues offline (see 4.3).
- Suggested stack (aligns with existing team expertise): Django + DRF +
  Channels/SSE + Redis, Postgres; thin PWA frontend. The bracket engine is a
  standalone pure-Python package with its own test suite.

### 4.7 MVP success criteria

- 10 recurring weekly tournaments (same TD returns 4+ consecutive weeks).
- ≥70% of players in those events tap the live bracket; ≥50% enable push.
- Zero bracket-integrity incidents (engine bugs requiring event recreation).
- Median score→bracket propagation <1s; scoring works through a Wi-Fi drop.

## 5. Phase 1 — Parity: replace DigitalPool for a serious TD

**Goal:** a promoter running monthly 64–128 player Fargo-rated opens has no
reason left to use DigitalPool.

1. **FargoRate integration** (gated on API access — see Risks):
   player search/link to Fargo IDs, effective ratings + robustness display,
   Fargo-based handicap races and game spots, auto-reporting of results,
   USAPL race format. Handle the 7-player rating minimum gracefully (warn TDs
   when an event won't rate).
2. **Online registration + payments:** Stripe; entry fees, greens fees,
   added-money display; refunds; waitlists. Pass-through fee transparency
   (show players exactly what the organizer pays — contrast with "pay twice").
3. **Multi-stage formats:** group stage → knockout, split brackets (A/B side
   events), consolation/second-chance brackets — shipping what DP labels
   "Coming Soon".
4. **Discovery:** public calendar, search by distance/date/game/format, venue
   pages, iCal feeds. (Called out as a DP usability gap.)
5. **Stats & history:** player profiles, head-to-head, per-event archives,
   printable results; CSV export of everything.
6. **Streaming:** OBS-compatible browser-source overlays (score bug, bracket),
   per-table stream URL registry.
7. **Native app decision point:** only wrap the PWA into store apps once push
   + performance metrics prove out; do not repeat DP's premature-native mistake.
8. **Introduce paid tiers** (organizers only — see §7).

**Parity exit criteria:** 5 promoters run ≥64-player Fargo-reported events
with online prepaid registration; support load <2 tickets/event.

## 6. Phase 2 — Beyond: leagues, venues, and the institutional long game

**Goal:** attack CompuSport's moat where it is weakest (player experience) and
build what no incumbent has.

1. **League management:** divisions, sessions, team formats (5-man round
   robin, Scotch doubles), weekly score sheets, standings, playoffs seeded
   from session standings, sub rules, fee/dues tracking. Handicap systems:
   Fargo-based, ball-average, plus/minus (parity with FargoRate LMS concepts).
2. **Multi-division event automation:** the Vegas-scale problem — hundreds of
   brackets, room scheduling, table blocks across divisions, master callout
   queue. This is CompuSport's stronghold; win rooms first, bodies later.
3. **Venue/organization tooling** (CueScore parity): org pages, membership
   module, digital scoreboards for house tables, recurring series templates.
4. **Sanctioning-body partnerships:** approach regional tours and smaller
   bodies (state VNEA/ACS affiliates) with the pitch "your players already
   prefer our app"; the CompuSport relationships (VNEA, NDA, APA, ACS, PPD,
   NADO) took a decade — expect the same horizon.
5. **Open platform:** public read API + webhooks (brackets, scores, results),
   embeds for room websites, data export guarantees. None of the incumbents
   offer this; it converts the community's tinkerers into advocates.
6. **Beyond-parity bets (pick 2–3, validate with users):**
   - TD copilot: auto chart-the-field (Fargo-balanced chip assignments,
     suggested races), payout suggestions from field size/history.
   - Spectator mode: follow a player, get their match notifications.
   - Rack-by-rack optional stat capture (break-and-runs, hill-hill records)
     feeding player profiles.
   - Multi-language (CompuSport's bilingual CA base; CueScore's EU base).

## 7. Pricing strategy

Per the research: DP charges subscriptions ($15–50/mo) with per-event fallback
($1.50–$5); CompuSport charges $1/player/bracket capped at $3/player;
Challonge anchors free at 256 players.

- **Free forever:** everything a player touches (P1), plus organizer MVP
  features for small events (≤32 players) — undercut Challonge on
  pool-specific value at the size class where weekly bar events live.
- **Organizer Pro (~$15–25/mo or ~$1/player capped ~$3, whichever the TD
  prefers):** larger fields, Fargo auto-reporting, online payments (plus
  Stripe pass-through), streaming overlays, multi-stage formats.
- **Venue/League (~$40–60/mo):** league management, org pages, scoreboards,
  multiple admins — priced against CueScore Pro (€29) and DP Enterprise ($50).
- **Covenants (marketing-visible):** no ads anywhere, players never charged,
  no feature ever moves from free to paid for existing events, full data
  export on every tier. Each covenant is a documented incumbent grievance.

## 8. Risks and open questions

| Risk | Impact | Mitigation |
|---|---|---|
| **FargoRate API access terms unknown** (cost/approval/rate limits) | Phase 1 centerpiece blocked | Engage FargoRate early in MVP; fallback: manual-entry effective ratings + TD-uploaded rating sheets; design handicapping to be rating-source-agnostic |
| DP free-tier boundary unknown (refuted claim) | Freemium positioning misjudged | Re-verify by creating a DP free account before finalizing tier limits |
| DP ships its missing formats before our launch | Wedge #2 narrows | Wedge #1 (player experience) is independent and larger |
| Incumbent per-event lock-in (leagues mandate CompuSport) | Player-led growth stalls at league night | Beachhead is independent weekly tournaments, not sanctioned league play |
| Organizer-side workflow evidence is thin (research caveat) | MVP TD UX misses real pain | Do 5–10 TD ride-alongs during MVP design; treat §4.2 as hypotheses |
| Tiny-sample app-store signals for DP | Overweighting anecdotes | Signals used directionally; the CompuSport 527-rating sample carries the thesis |

## 9. Metrics that matter

- **North star:** weekly active tournaments (an event run start-to-finish).
- Player NPS + app-store rating vs. the incumbents' 2.3–3.25★ (the scoreboard
  for wedge #1); push-notification opt-in and delivery-success rates.
- TD retention (4-week consecutive), time-to-first-bracket, bracket-integrity
  incident count (target: zero, permanently).
- Phase 1+: % events Fargo-reported, prepaid-registration share, revenue per
  organizer.

## 10. Suggested build order (MVP)

1. Bracket engine package + property/golden tests (P2 is the foundation).
2. TD web app: create → register → seed → run (engine consumer #1).
3. Public live views + real-time transport.
4. QR table scoring PWA with offline queue.
5. Web-push match callouts via magic-link slot claim.
6. Payout calculator, audit log, polish; pilot with 2–3 friendly TDs.
