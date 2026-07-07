//! Two-phase (slide → roll) billiards physics core.
//!
//! Each ball carries a linear velocity **v** and a *rolling velocity* **s** (the
//! surface velocity R·ω projected onto the table). The contact point slips at
//! u = v − s. While |u| > 0 the ball SLIDES: Coulomb friction of magnitude
//! MU_SLIDE acts on the centre opposite u, and (because a solid sphere has
//! I = 2/5·mR²) the slip decays at 7/2 that rate until u = 0, when the ball
//! begins to ROLL and thereafter only sheds speed to the much smaller rolling
//! resistance. This is the Coriolis model used by research-grade simulators
//! (pooltool / Leckie–Greenspan): follow, stun and draw are no longer special
//! cases — they emerge from the spin state the cue carries into a collision.
//!
//! Motion is advanced by a fine fixed timestep (sub-stepped so a ball never
//! moves more than a fraction of its radius — no tunneling). Only the resulting
//! EVENTS (ball-ball, rail, pocket) and slide→roll waypoints are emitted; the
//! host renders piecewise-linearly between them, so the internal law is free.
//!
//! Zero dependencies (see Cargo.toml): the wasm ABI is a flat f64 array in and a
//! JSON string out, so it builds for wasm32-unknown-unknown with the bundled
//! rust-lld — no MSVC, no wasm-bindgen, no wasm-pack.

const BALL_D: f64 = 2.25;
// Rail lines for the BALL CENTER (already radius-adjusted, like RAILS in JS)
const RAIL_MIN_X: f64 = 3.125;
const RAIL_MAX_X: f64 = 96.875;
const RAIL_MIN_Y: f64 = 3.125;
const RAIL_MAX_Y: f64 = 46.875;
const BACKSTOP: f64 = 2.2; // wall beyond the rail line inside pocket mouths

const POCKETS: [(&str, f64, f64); 6] = [
    ("corner-tl", 1.5, 1.5),
    ("corner-tr", 98.5, 1.5),
    ("corner-bl", 1.5, 48.5),
    ("corner-br", 98.5, 48.5),
    ("side-top", 50.0, 0.0),
    ("side-bottom", 50.0, 50.0),
];
const CAPTURE_R: f64 = 4.0;
const MOUTH_R: f64 = 5.0;

const RAIL_COR: f64 = 0.85;
const BALL_COR: f64 = 0.95;
// Coulomb friction coefficient at a ball-ball contact. Drives collision-induced
// "throw": a cut shot drags the struck ball slightly off the pure line of
// centers. ~0.06 for clean polished balls (Dr. Dave's measured average).
const MU_BALL: f64 = 0.06;

// ── Two-phase friction (sim units: table is 100×50, ball D=2.25, speeds ≈
// force×45 units/s). Rolling resistance keeps the previously-tuned decay so
// roll distances are unchanged; sliding is a much stronger, briefer phase. ──
// Roll: v(t)=v0·e^(−λt). λ from the old JS tuning (per-step 0.985 @ 60/s).
fn lambda_roll() -> f64 {
    -60.0 * (0.985_f64).ln()
}
// Sliding deceleration of the CENTRE (units/s²). The slip decays at 7/2 of this,
// so a plain (centre-ball) strike reaches natural roll at 5/7 of its speed after
// a short slide — then follows. Tuned so that slide covers ~1 diamond at medium
// pace while cuts still reach the pocket.
const MU_SLIDE: f64 = 620.0;
// Max rolling-velocity a full tip of english imparts, as a multiple of the cue's
// launch speed: e.y=−1 (top) → +SPIN_MAX·v (follow), e.y=+1 (bottom) → −SPIN_MAX·v
// (draw, cue can reverse). e.y=0 (centre) → 0 spin → slide → natural roll.
const SPIN_MAX: f64 = 1.7;
// Fraction of the striker's rolling velocity (spin) that survives a ball-ball
// impact. <1 so a centre-ball cue follows but doesn't chase the object down.
const SPIN_RETAIN: f64 = 0.3;

const V_MIN: f64 = 1.2; // units/sec (0.02 * 60): below this a rolling ball stops
const SLIP_EPS: f64 = 0.8; // |u| below this = rolling (snap s to v)
const EPS: f64 = 1e-9;
const RAIL_EVENT_MIN_SPEED: f64 = 3.0; // units/sec (0.05 * 60), matches JS gate
const DT: f64 = 1.0 / 300.0; // base timestep; sub-stepped at high speed
const MAX_STEP_DIST: f64 = BALL_D * 0.35; // cap movement/substep (anti-tunnel)

#[derive(Clone)]
pub struct Ball {
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub vx: f64,
    pub vy: f64,
    // rolling velocity (surface velocity R·ω projected on the table). Natural
    // roll ⇔ (sx,sy) == (vx,vy); slip u = v − s drives sliding friction.
    pub sx: f64,
    pub sy: f64,
    pub pocketed: bool,
    // set true while sliding so we emit exactly one slide→roll waypoint
    was_sliding: bool,
}

impl Ball {
    fn speed(&self) -> f64 {
        (self.vx * self.vx + self.vy * self.vy).sqrt()
    }
    fn slip(&self) -> f64 {
        let ux = self.vx - self.sx;
        let uy = self.vy - self.sy;
        (ux * ux + uy * uy).sqrt()
    }
    fn moving(&self) -> bool {
        !self.pocketed && (self.speed() > EPS || self.slip() > SLIP_EPS)
    }
}

pub struct English {
    pub x: f64,
    pub y: f64,
}

pub enum EventKind {
    Hit(usize, usize),
    Rail(usize, &'static str),
    Pocket(usize, &'static str),
    Spin(usize), // slide→roll waypoint (kept name for host compatibility)
}

pub struct Event {
    pub kind: EventKind,
    pub t: f64,
    pub balls: Vec<Ball>,
}

pub struct Output {
    pub events: Vec<Event>,
    pub final_balls: Vec<Ball>,
    pub duration: f64,
}

fn in_pocket_mouth(x: f64, y: f64) -> bool {
    POCKETS
        .iter()
        .any(|&(_, px, py)| (x - px).powi(2) + (y - py).powi(2) < MOUTH_R * MOUTH_R)
}

/// Advance one ball's velocity + rolling velocity by dt under two-phase friction.
fn step_friction(b: &mut Ball, dt: f64, lam: f64) {
    let ux = b.vx - b.sx;
    let uy = b.vy - b.sy;
    let u = (ux * ux + uy * uy).sqrt();
    if u > SLIP_EPS {
        // SLIDING: friction on the centre opposes slip; the rolling velocity
        // gains toward v so that the slip u decays at 7/2 the centre rate.
        let nx = ux / u;
        let ny = uy / u;
        let dv = MU_SLIDE * dt; // centre speed change
        b.vx -= dv * nx;
        b.vy -= dv * ny;
        // d(s)/dt = +(5/2)·MU_SLIDE·û  ⇒  d(u)/dt = −(7/2)·MU_SLIDE·û
        b.sx += 2.5 * dv * nx;
        b.sy += 2.5 * dv * ny;
        // don't overshoot the rolling condition within a step
        let nux = b.vx - b.sx;
        let nuy = b.vy - b.sy;
        if nux * ux + nuy * uy <= 0.0 {
            b.sx = b.vx;
            b.sy = b.vy;
        }
    } else {
        // ROLLING: shed speed to rolling resistance (exponential, as tuned),
        // spin locked to translation.
        let decay = (-lam * dt).exp();
        b.vx *= decay;
        b.vy *= decay;
        b.sx = b.vx;
        b.sy = b.vy;
        if b.speed() <= V_MIN {
            b.vx = 0.0;
            b.vy = 0.0;
            b.sx = 0.0;
            b.sy = 0.0;
        }
    }
}

/// Resolve a ball-ball contact in place: normal restitution + Coulomb throw.
/// Spin (rolling velocity) is carried through unchanged — the struck ball keeps
/// its zero spin and slides, the cue keeps its topspin/backspin and follows/draws.
fn resolve_hit(balls: &mut [Ball], i: usize, j: usize) -> bool {
    // Rewind to the EXACT moment the gap was BALL_D so the contact normal is
    // precise (discrete stepping detects contact already overlapping; a cut is
    // very sensitive to a wrong normal). Solve |Δp − Δv·h| = BALL_D for the
    // smallest h ≥ 0, back both balls up by v·h, then re-advance after resolving.
    let dpx = balls[i].x - balls[j].x;
    let dpy = balls[i].y - balls[j].y;
    let dvx = balls[i].vx - balls[j].vx;
    let dvy = balls[i].vy - balls[j].vy;
    let a = dvx * dvx + dvy * dvy;
    let mut h = 0.0_f64;
    if a > EPS {
        let bb = dpx * dvx + dpy * dvy;
        let c = dpx * dpx + dpy * dpy - BALL_D * BALL_D;
        let disc = bb * bb - a * c;
        if disc >= 0.0 {
            let sq = disc.sqrt();
            let h1 = (bb - sq) / a;
            let h2 = (bb + sq) / a;
            // smallest non-negative rewind
            h = if h1 >= -EPS { h1 } else { h2 };
            if h < 0.0 { h = 0.0; }
        }
    }
    if h > 0.0 {
        balls[i].x -= balls[i].vx * h;
        balls[i].y -= balls[i].vy * h;
        balls[j].x -= balls[j].vx * h;
        balls[j].y -= balls[j].vy * h;
    }

    let dx = balls[j].x - balls[i].x;
    let dy = balls[j].y - balls[i].y;
    let dist = (dx * dx + dy * dy).sqrt();
    if dist <= EPS {
        return false;
    }
    let nx = dx / dist;
    let ny = dy / dist;
    let dvn = (balls[i].vx - balls[j].vx) * nx + (balls[i].vy - balls[j].vy) * ny;
    if dvn <= 0.0 {
        return false; // separating
    }
    let imp = dvn * BALL_COR;
    balls[i].vx -= imp * nx;
    balls[i].vy -= imp * ny;
    balls[j].vx += imp * nx;
    balls[j].vy += imp * ny;

    // collision-induced throw: tangential Coulomb impulse opposing surface slip
    // along the tangent, capped at MU_BALL·|normal impulse|.
    let tx = -ny;
    let ty = nx;
    let dvt = (balls[i].vx - balls[j].vx) * tx + (balls[i].vy - balls[j].vy) * ty;
    let jt = (MU_BALL * imp).min(dvt.abs() * 0.5) * dvt.signum();
    balls[i].vx -= jt * tx;
    balls[i].vy -= jt * ty;
    balls[j].vx += jt * tx;
    balls[j].vy += jt * ty;

    // The struck ball leaves with no spin → it slides then rolls. The striker
    // keeps only a fraction of its spin: a real ball-ball impact sheds spin, and
    // this keeps a natural-roll (centre-ball) cue from *chasing down* the object
    // ball it just hit while still giving deliberate follow/draw its bite.
    balls[i].sx *= SPIN_RETAIN;
    balls[i].sy *= SPIN_RETAIN;
    balls[j].sx = 0.0;
    balls[j].sy = 0.0;
    balls[j].was_sliding = false;
    // re-advance the rewound interval with the post-collision velocities (which
    // now point apart), so the pair separates and isn't re-detected next step.
    if h > 0.0 {
        balls[i].x += balls[i].vx * h;
        balls[i].y += balls[i].vy * h;
        balls[j].x += balls[j].vx * h;
        balls[j].y += balls[j].vy * h;
    }
    true
}

pub fn simulate_core(mut balls: Vec<Ball>, english: Option<English>, max_time: f64) -> Output {
    let lam = lambda_roll();
    let cue_idx = balls.iter().position(|b| b.id == "cue");
    let mut events: Vec<Event> = Vec::new();
    let mut t_now = 0.0_f64;

    // Apply english at the strike. e.y sets the cue's launch spin (follow/draw);
    // e.x (side) is consumed as object throw at the first cue contact.
    let mut side_english = 0.0_f64;
    let mut side_pending = false;
    if let (Some(ci), Some(e)) = (cue_idx, english) {
        let sp = balls[ci].speed();
        if sp > EPS {
            let dirx = balls[ci].vx / sp;
            let diry = balls[ci].vy / sp;
            // e.y<0 = top/follow (s>v), e.y>0 = bottom/draw (s<v, can be negative)
            let spin_speed = (-e.y) * SPIN_MAX * sp;
            balls[ci].sx = dirx * spin_speed;
            balls[ci].sy = diry * spin_speed;
        }
        if e.x != 0.0 {
            side_english = e.x;
            side_pending = true;
        }
    }

    // stop any ball that starts below V_MIN with no spin
    for b in balls.iter_mut() {
        if b.speed() <= V_MIN && b.slip() <= SLIP_EPS {
            b.vx = 0.0;
            b.vy = 0.0;
            b.sx = 0.0;
            b.sy = 0.0;
        }
        b.was_sliding = b.slip() > SLIP_EPS;
    }

    let max_iters = ((max_time / DT) as usize + 8) * 4;
    for _ in 0..max_iters {
        if t_now >= max_time {
            break;
        }
        if balls.iter().all(|b| !b.moving()) {
            break;
        }

        // sub-step so the fastest ball moves < MAX_STEP_DIST (anti-tunnel)
        let vmax = balls
            .iter()
            .filter(|b| !b.pocketed)
            .map(|b| b.speed())
            .fold(0.0_f64, f64::max);
        let mut dt = DT.min(max_time - t_now);
        if vmax * dt > MAX_STEP_DIST {
            dt = MAX_STEP_DIST / vmax;
        }
        if dt <= 0.0 {
            break;
        }

        // integrate friction, then move
        for b in balls.iter_mut() {
            if !b.moving() {
                continue;
            }
            step_friction(b, dt, lam);
            b.x += b.vx * dt;
            b.y += b.vy * dt;
        }
        t_now += dt;

        // ── rails ──
        for i in 0..balls.len() {
            if balls[i].pocketed {
                continue;
            }
            // x rails
            for (lo, name, is_min) in [(RAIL_MIN_X, "left", true), (RAIL_MAX_X, "right", false)] {
                let past = if is_min { balls[i].x < lo } else { balls[i].x > lo };
                let toward = if is_min { balls[i].vx < 0.0 } else { balls[i].vx > 0.0 };
                if past && toward {
                    let back = if is_min { lo - BACKSTOP } else { lo + BACKSTOP };
                    // open pocket mouth: let the ball pass to the backstop
                    let hard = if in_pocket_mouth(balls[i].x, balls[i].y) {
                        (is_min && balls[i].x < back) || (!is_min && balls[i].x > back)
                    } else {
                        true
                    };
                    if hard {
                        let line = if in_pocket_mouth(balls[i].x, balls[i].y) { back } else { lo };
                        balls[i].x = line;
                        balls[i].vx = -balls[i].vx * RAIL_COR;
                        balls[i].sx = -balls[i].sx * RAIL_COR;
                        if balls[i].vx.abs() > RAIL_EVENT_MIN_SPEED {
                            events.push(Event { kind: EventKind::Rail(i, name), t: t_now, balls: balls.clone() });
                        }
                    }
                }
            }
            // y rails
            for (lo, name, is_min) in [(RAIL_MIN_Y, "top", true), (RAIL_MAX_Y, "bottom", false)] {
                let past = if is_min { balls[i].y < lo } else { balls[i].y > lo };
                let toward = if is_min { balls[i].vy < 0.0 } else { balls[i].vy > 0.0 };
                if past && toward {
                    let back = if is_min { lo - BACKSTOP } else { lo + BACKSTOP };
                    let hard = if in_pocket_mouth(balls[i].x, balls[i].y) {
                        (is_min && balls[i].y < back) || (!is_min && balls[i].y > back)
                    } else {
                        true
                    };
                    if hard {
                        let line = if in_pocket_mouth(balls[i].x, balls[i].y) { back } else { lo };
                        balls[i].y = line;
                        balls[i].vy = -balls[i].vy * RAIL_COR;
                        balls[i].sy = -balls[i].sy * RAIL_COR;
                        if balls[i].vy.abs() > RAIL_EVENT_MIN_SPEED {
                            events.push(Event { kind: EventKind::Rail(i, name), t: t_now, balls: balls.clone() });
                        }
                    }
                }
            }
        }

        // ── ball-ball contacts ──
        for i in 0..balls.len() {
            if balls[i].pocketed {
                continue;
            }
            for j in (i + 1)..balls.len() {
                if balls[j].pocketed {
                    continue;
                }
                let dx = balls[j].x - balls[i].x;
                let dy = balls[j].y - balls[i].y;
                if dx * dx + dy * dy <= BALL_D * BALL_D + EPS {
                    let was_side = side_pending
                        && (Some(i) == cue_idx || Some(j) == cue_idx);
                    if resolve_hit(&mut balls, i, j) {
                        // side english throws the object ball off the tangent
                        if was_side {
                            let oi = if Some(i) == cue_idx { j } else { i };
                            let os = balls[oi].speed();
                            if os > EPS {
                                let throw = side_english * 0.05;
                                let oa = balls[oi].vy.atan2(balls[oi].vx) + throw;
                                balls[oi].vx = oa.cos() * os;
                                balls[oi].vy = oa.sin() * os;
                            }
                            side_pending = false;
                        }
                        events.push(Event { kind: EventKind::Hit(i, j), t: t_now, balls: balls.clone() });
                    }
                }
            }
        }

        // ── pockets ──
        for i in 0..balls.len() {
            if balls[i].pocketed {
                continue;
            }
            for &(name, px, py) in POCKETS.iter() {
                let dx = balls[i].x - px;
                let dy = balls[i].y - py;
                if dx * dx + dy * dy <= CAPTURE_R * CAPTURE_R {
                    balls[i].pocketed = true;
                    balls[i].vx = 0.0;
                    balls[i].vy = 0.0;
                    balls[i].sx = 0.0;
                    balls[i].sy = 0.0;
                    events.push(Event { kind: EventKind::Pocket(i, name), t: t_now, balls: balls.clone() });
                    break;
                }
            }
        }

        // ── slide→roll waypoints (one per slide phase, for the follow/draw bend) ──
        for i in 0..balls.len() {
            if balls[i].pocketed {
                continue;
            }
            let sliding = balls[i].slip() > SLIP_EPS;
            if balls[i].was_sliding && !sliding && balls[i].speed() > RAIL_EVENT_MIN_SPEED {
                events.push(Event { kind: EventKind::Spin(i), t: t_now, balls: balls.clone() });
            }
            balls[i].was_sliding = sliding;
        }
    }

    Output { events, final_balls: balls, duration: t_now }
}

// ── JSON output (hand-rolled; ids are simple alnum strings) ──

fn push_balls_json(out: &mut String, balls: &[Ball]) {
    out.push('{');
    for (k, b) in balls.iter().enumerate() {
        if k > 0 {
            out.push(',');
        }
        out.push_str(&format!(
            "\"{}\":{{\"x\":{:.2},\"y\":{:.2},\"pocketed\":{}}}",
            b.id, b.x, b.y, b.pocketed
        ));
    }
    out.push('}');
}

pub fn output_to_json(o: &Output) -> String {
    let mut s = String::with_capacity(4096);
    s.push_str("{\"events\":[");
    for (k, e) in o.events.iter().enumerate() {
        if k > 0 {
            s.push(',');
        }
        match &e.kind {
            EventKind::Hit(i, j) => s.push_str(&format!(
                "{{\"type\":\"ball-ball\",\"t\":{:.4},\"ids\":[\"{}\",\"{}\"],",
                e.t, e.balls[*i].id, e.balls[*j].id
            )),
            EventKind::Rail(i, name) => s.push_str(&format!(
                "{{\"type\":\"rail\",\"t\":{:.4},\"id\":\"{}\",\"rail\":\"{}\",",
                e.t, e.balls[*i].id, name
            )),
            EventKind::Pocket(i, name) => s.push_str(&format!(
                "{{\"type\":\"pocket\",\"t\":{:.4},\"id\":\"{}\",\"pocket\":\"{}\",",
                e.t, e.balls[*i].id, name
            )),
            EventKind::Spin(i) => s.push_str(&format!(
                "{{\"type\":\"spin\",\"t\":{:.4},\"id\":\"{}\",",
                e.t, e.balls[*i].id
            )),
        }
        s.push_str("\"balls\":");
        push_balls_json(&mut s, &e.balls);
        s.push('}');
    }
    s.push_str("],\"final\":");
    push_balls_json(&mut s, &o.final_balls);
    s.push_str(&format!(",\"duration\":{:.4}}}", o.duration));
    s
}

// ── wasm ABI ──
// Input: flat f64 array [n_balls, max_time, has_english, ex, ey,
//                        then per ball: id_code, x, y, vx, vy]
// id_code 0 = cue, 1..=15 = numbered balls.
// Returns a packed u64: (ptr << 32) | len of a UTF-8 JSON string in wasm memory.

#[no_mangle]
pub extern "C" fn alloc_f64(n: usize) -> *mut f64 {
    let mut v = vec![0.0_f64; n];
    let ptr = v.as_mut_ptr();
    std::mem::forget(v);
    ptr
}

#[no_mangle]
pub unsafe extern "C" fn simulate_raw(ptr: *const f64, len: usize) -> u64 {
    let data = std::slice::from_raw_parts(ptr, len);
    let n = data[0] as usize;
    let max_time = if data[1] > 0.0 { data[1] } else { 10.0 };
    let english = if data[2] != 0.0 {
        Some(English { x: data[3], y: data[4] })
    } else {
        None
    };
    let mut balls = Vec::with_capacity(n);
    for k in 0..n {
        let base = 5 + k * 5;
        let code = data[base] as i64;
        let id = if code == 0 { "cue".to_string() } else { code.to_string() };
        balls.push(Ball {
            id,
            x: data[base + 1],
            y: data[base + 2],
            vx: data[base + 3],
            vy: data[base + 4],
            sx: 0.0,
            sy: 0.0,
            pocketed: false,
            was_sliding: false,
        });
    }
    let json = output_to_json(&simulate_core(balls, english, max_time));
    let bytes = json.into_bytes();
    let out_ptr = bytes.as_ptr() as u64;
    let out_len = bytes.len() as u64;
    std::mem::forget(bytes);
    (out_ptr << 32) | out_len
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ball(id: &str, x: f64, y: f64, vx: f64, vy: f64) -> Ball {
        Ball { id: id.to_string(), x, y, vx, vy, sx: 0.0, sy: 0.0, pocketed: false, was_sliding: false }
    }

    fn find_pocket<'a>(o: &'a Output) -> Option<(&'a str, &'a str)> {
        o.events.iter().find_map(|e| match &e.kind {
            EventKind::Pocket(i, name) => Some((e.balls[*i].id.as_str(), *name)),
            _ => None,
        })
    }

    #[test]
    fn straight_roll_into_corner_pocket() {
        let dx: f64 = 98.5 - 80.0;
        let dy: f64 = 48.5 - 37.7;
        let len = (dx * dx + dy * dy).sqrt();
        let out = simulate_core(
            vec![ball("1", 80.0, 37.7, dx / len * 160.0, dy / len * 160.0)],
            None,
            10.0,
        );
        assert_eq!(find_pocket(&out), Some(("1", "corner-br")));
    }

    #[test]
    fn rail_bounce_reflects_at_rail_line() {
        let out = simulate_core(vec![ball("1", 25.0, 25.0, -160.0, 0.0)], None, 10.0);
        let rail = out
            .events
            .iter()
            .find_map(|e| match &e.kind {
                EventKind::Rail(i, name) => Some((&e.balls[*i], *name)),
                _ => None,
            })
            .expect("rail event");
        assert_eq!(rail.1, "left");
        assert!((rail.0.x - RAIL_MIN_X).abs() < 1.0, "bounced near {}", rail.0.x);
    }

    #[test]
    fn draw_returns_the_cue() {
        // cue strikes an object dead-on with heavy draw (bottom english); after
        // potting the object the cue should come BACK toward the shooter.
        let out = simulate_core(
            vec![
                ball("cue", 30.0, 25.0, 200.0, 0.0),
                ball("1", 55.0, 25.0, 0.0, 0.0),
            ],
            Some(English { x: 0.0, y: 1.0 }),
            10.0,
        );
        let fin_cue = out.final_balls.iter().find(|b| b.id == "cue").unwrap();
        assert!(fin_cue.x < 55.0 - BALL_D, "draw should pull the cue back, ended at {}", fin_cue.x);
    }

    #[test]
    fn no_tunneling_at_extreme_speed() {
        let out = simulate_core(
            vec![
                ball("cue", 10.0, 25.0, 4000.0, 0.0),
                ball("1", 60.0, 25.0, 0.0, 0.0),
            ],
            None,
            10.0,
        );
        assert!(
            out.events.iter().any(|e| matches!(e.kind, EventKind::Hit(..))),
            "must contact, never tunnel"
        );
    }

    #[test]
    fn json_output_shape() {
        let out = simulate_core(vec![ball("1", 25.0, 25.0, -160.0, 0.0)], None, 10.0);
        let json = output_to_json(&out);
        assert!(json.starts_with("{\"events\":["));
        assert!(json.contains("\"final\":"));
        assert!(json.contains("\"rail\":\"left\""));
    }
}
