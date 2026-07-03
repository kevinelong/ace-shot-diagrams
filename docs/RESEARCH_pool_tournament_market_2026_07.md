# RESEARCH: Pool Tournament Software Market (July 2026)

Verified market research on pool/billiards tournament management software, gathered
2026-07-02 to inform `SPEC_pool_tournament_platform.md`. Claims below survived a
3-vote adversarial verification pass against live primary sources (vendor sites,
production JS bundles, app-store listings) and practitioner forums. 24 of 25
top claims confirmed; 1 refuted (noted at the end).

---

## 1. Competitor landscape

The market splits into **pool-specific platforms** (DigitalPool, CompuSport,
CueScore, FargoRate LMS) and **generic bracket tools** (Challonge, BracketHQ).

### DigitalPool (digitalpool.com) — the feature-forward web incumbent (US)

**Positioning.** Self-serve platform for creating/managing pool leagues and
tournaments. Real-time live scoring and stats are core; players can live-score
**without a DP account** (per-table scoring URLs). [3-0 verified]

**Pricing** (verified verbatim from production JS bundle incl. Stripe price IDs):

| Tier | Monthly | Yearly (~20% off) |
|---|---|---|
| Free | $0 | — |
| Player | $10/mo | $100/yr |
| Promoter | $15/$20/$25/mo (bracket size 32/64/256) | $144–$240/yr |
| Enterprise | $50/mo | $480/yr |

Pay-per-event option: $1.50 (8-player), $2.50 (16-player), $5.00 (32-player)
single tournaments. League Manager is priced separately (per-player $5/mo
increments). [3-0]

**FargoRate integration — the strongest in the market and the bar to meet.**
Per-player Fargo IDs / effective ratings / robustness in the data model,
optional auto-reporting of results to FargoRate, automated Fargo-based handicap
races and game spots, a USAPL race format option, and direct calls to
`api.fargorate.com` / `lms.fargorate.com` with fallback logic. [3-0, two claims]

**Format gaps (exploitable).** As of mid-2026 the format selector still shows
**Round Robin "Coming Soon"** and **"Play The Field" chip variant "Coming
Soon"**, with split-bracket and group-stage options also gated. Standard chip
format is available. [2-1 — primary-source evidence, one dissenting vote]

**Mobile is the weak flank.**
- iOS app launched 2025-09-16; **4.2★ from only 9 ratings** as of mid-2026.
  Review: "A good idea poorly executed. A mobile app that isn't formatted for
  mobile devices isn't much use." [3-0]
- Android player app: **~5K+ installs, ~3.4–3.6★ from 11 ratings**. March 2026
  reviews report **failed match callouts / could not log games** at tournaments
  (1★, 2026-03-15) and inability to get through "a simple chip tourney without
  bugs" (2★, 2026-03-24). [3-0, three claims]

**Forum pain points (directional, from AZBilliards threads):**
- Bracket-engine bug: double elimination with single-elimination finals never
  converged winner/loser sides into a final; TD had to recreate the event
  (thread 572368, Jan 2025).
- ~10-second lag incrementing scores on iPads during live scoring (2021 thread).
- Tournament discovery called out as a usability gap.
- "Digital Pool no longer free" backlash thread (565218): forum user reports
  >32-player tournaments require a paid plan (~$25/mo) as of May 2024 —
  *directional only; the precise free-tier boundary failed verification, see
  Refuted below.*

### CompuSport — the institutional incumbent

**Moat.** Partnerships or operational use by **VNEA, NDA, APA, ACS, PPD, and
NADO** (corroborated on the bodies' own sites: dedicated VNEA portal, NADO
scorekeeping instructions, hosts the official BCA rules PDF), used at the Las
Vegas World Pool Championships since 2012. Markets itself as "the only fully
automated event management system" (puffery, but reflects real end-to-end
registration→event→payment automation). [3-0, three claims]

**Pricing.** Per-event, not subscription: **$1/player/bracket, capped at
$3/player/tournament**, plus optional $1/player online-registration fee (only
for players who register online; Stripe 2.9% + $0.30 on top). Organizers
typically pass this through as per-player fees. [3-0]

**The market's biggest documented pain point — the player app.**
- Android: **3.25★ from 527 ratings, ~32% one-star (168)**, despite 100K+
  downloads. iOS even lower: **2.3★ from 91 ratings**. [3-0]
- Monetizes *players* via ads and $0.99–$29.99 IAPs — **even basic push
  notifications for match calls are pay-gated** (developer's own description:
  "Receive push notifications with an in-app purchase").
- Recurring complaints: slow loading, freezing, poor navigation, non-mobile-
  friendly website, "you get to see ads for events you've paid money to join",
  "forced to use due to leagues and tournaments… constantly freezes."
- iOS reviews add: features that used to be free moved behind premium; players
  feel they "pay twice" (organizers pass fees through *and* the app charges).

This is a **captive-but-dissatisfied user base** — the single largest wedge for
a replacement: free, reliable player notifications and no ads for paying
entrants.

### Challonge — the generic price floor

Free Standard plan: $0, ad-supported, unlimited tournaments, up to 256
participants. Premier: **$12/mo ($6.99/mo billed yearly)** with a thin feature
set — ad removal, 512-participant cap, 25MB uploads, custom-theme embedding,
one Pro Community License, priority support, waived $0.75/order registration
fees. [3-0, three claims]

**Zero pool-specific features** — no Fargo, no handicapping, no per-rack
scoring. Forum complaint: Challonge's double-elimination **loser-side ordering
does not match traditional paper pool brackets**, confusing players and TDs
raised on paper charts. Trustpilot signal is negligible (2 reviews, 3.5/5).

### CueScore — the European incumbent

CueScore Pro (venue/organization subscription): **€29/mo or €249/yr**,
region-dependent pricing. [3-0] Bundles organization page, digital scoreboard,
team league management, handicap management, and a membership module. Strongest
incumbent in Europe.

### FargoRate LMS — the ratings gatekeeper

- Positions itself as **the only league management system integrated with
  FargoRate**: league match data flows to FargoRate nightly; updated ratings
  flow back for handicapping. A closed/exclusive ecosystem.
- Supports three handicap systems per division: Ball Average, Plus/Minus, and
  Fargo-rating-based (per round or per match); ships companion apps.
- **FargoRate imposes a 7-player minimum** for a tournament to count toward
  ratings — any integrating product must handle/communicate this.

### Legacy / minor players

IngenPool (rebranded BudTour after sale): ~$35 permanent desktop license,
~$70–75/yr for online tournament posting, 5-tournament free trial. Forum users
also mention Pooladmin and TournamentAPP. Desktop-era tools persist because TDs
trust their bracket handling — but they have no live/mobile story.

---

## 2. Synthesis: where the openings are

1. **Mobile reliability is the #1 gap across the whole market.** CompuSport's
   100K+ players rate their mandatory app 2.3–3.25★; DigitalPool's new apps are
   buggy (failed callouts, chip-tourney bugs) with almost no adoption. Nobody
   has shipped a mobile player experience people like.
2. **Player-hostile monetization is resented.** Pay-gated match notifications
   and ads shown to paying entrants are the most emotionally charged
   complaints. "Free for players, organizers pay" is the obvious counter.
3. **Format completeness is unfinished even at the leader.** Round robin and
   chip variants still "Coming Soon" at DigitalPool in mid-2026.
4. **Bracket-engine correctness is a trust issue.** DigitalPool's
   non-converging finals bug and Challonge's paper-mismatched loser-side
   routing both burned TDs publicly. Pool TDs compare software brackets to the
   paper charts they grew up with.
5. **FargoRate integration is table stakes in the US** — DigitalPool proved it
   is possible; access terms for third parties are an open question (risk).
6. **Institutional league integrations are the long game.** CompuSport's
   sanctioning-body moat took a decade-plus; it is a late-phase target, not an
   MVP feature.

## 3. Caveats

- No verified evidence surfaced on **BracketHQ**, APA's in-house systems, or
  CSI/BCAPL tooling beyond CompuSport hosting the BCA rules PDF; Reddit and
  Trustpilot yielded almost nothing that survived verification.
- DigitalPool app sentiment rests on tiny samples (9 iOS / 11 Android ratings)
  — directional, not statistical. CompuSport's 527-rating sample is robust.
- Pricing verified 2026-07-02; DigitalPool's numbers came from the client-side
  JS bundle (verbatim, with Stripe price IDs) and can shift with any deploy.
- **Refuted claim (0-3), do not reuse:** "DigitalPool's free plan caps
  tournaments at 32 players and excludes SMS, available as a $5/mo add-on."
  The actual free/paid boundary is unknown — see Open Questions.

## 4. Open questions

1. What are DigitalPool's actual free-tier limits (bracket size, notifications,
   live-scoring caps)? Critical for designing a competing freemium boundary.
2. What do BracketHQ, APA's official system, and CSI/BCAPL's FargoRate-linked
   LMS offer, and what do their users complain about?
3. What are FargoRate's API access terms for third parties (cost, approval,
   rate limits)? The replacement's handicapping/reporting story depends on it.
4. Organizer-side sentiment on tournament-day workflows (seeding, payouts,
   re-draws, no-shows) — player-side complaints dominated the verified evidence.

## 5. Key sources

Primary: digitalpool.com (+ tournament-builder page, production JS bundle,
docs.digitalpool.com), compusport.ca / compusport.us (+ support pricing
article), challonge.com/pricing (2026-07-01 Wayback snapshot), cuescore.com/pro,
lms.fargorate.com docs, Apple App Store and Google Play listings for
CompuSport and DigitalPool apps (live 2026-07-02).

Forums: AZBilliards threads 531271, 218761, 470926, 530987, 565218, 572368,
555648 (Fargo progression, p.28); Trustpilot challonge.com.
