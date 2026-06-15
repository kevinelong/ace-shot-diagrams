//! Event-driven, continuous-time billiards physics core.
//!
//! Matches the semantics of the JS simulation in index.html (same friction,
//! restitution, pocket capture, english model) but advances by solving for
//! the exact time of the next event instead of stepping a fixed timestep —
//! no tunneling, no integration error, trajectories are closed-form.
//!
//! The trick: every ball decays under the same exponential rolling friction
//! v(t) = v0·e^(−λt), so in warped time τ(t) = (1 − e^(−λt))/λ every position
//! is LINEAR: p(τ) = p0 + v0·τ. Ball-ball contacts, rail crossings and pocket
//! captures all become quadratic (or linear) solves in τ. After advancing to
//! an event, velocities scale by e^(−λΔt) = 1 − λτ and the clock restarts.
//!
//! Zero dependencies (see Cargo.toml): the wasm ABI is a flat f64 array in
//! and a JSON string out, so the crate builds for wasm32-unknown-unknown
//! with the bundled rust-lld — no MSVC, no wasm-bindgen, no wasm-pack.

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
// JS tuning: per-step friction 0.985 at 60 steps/s; v_min 0.02 units/step
fn lambda() -> f64 {
    -60.0 * (0.985_f64).ln()
}
const V_MIN: f64 = 1.2; // units/sec (0.02 * 60)
const EPS: f64 = 1e-9;
const RAIL_EVENT_MIN_SPEED: f64 = 3.0; // units/sec (0.05 * 60), matches JS gate

// Spin/curve model: with english the cue slides along the tangent line for
// SLIDE_TIME, then the spin asserts and adds a velocity component along the
// original aim direction (follow = forward, draw = backward) — the classic
// two-segment cue path. SPIN_GAIN scales it by the incoming cue speed.
const SLIDE_TIME: f64 = 0.13; // seconds of slide before roll asserts
const SPIN_GAIN: f64 = 0.6;

#[derive(Clone)]
pub struct Ball {
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub vx: f64,
    pub vy: f64,
    pub pocketed: bool,
    // pending spin transition: (dir_x, dir_y, magnitude, trigger_time)
    pub spin: Option<(f64, f64, f64, f64)>,
}

impl Ball {
    fn speed(&self) -> f64 {
        (self.vx * self.vx + self.vy * self.vy).sqrt()
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
    Spin(usize),
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

enum Candidate {
    Stop,
    Rail(usize, bool, &'static str),
    Pocket(usize, usize),
    Hit(usize, usize),
    Spin(usize),
}

fn in_pocket_mouth(x: f64, y: f64) -> bool {
    POCKETS
        .iter()
        .any(|&(_, px, py)| (x - px).powi(2) + (y - py).powi(2) < MOUTH_R * MOUTH_R)
}

/// First τ > EPS where |Δp + Δv·τ| crosses `dist` from outside, approaching.
fn contact_tau(dpx: f64, dpy: f64, dvx: f64, dvy: f64, dist: f64) -> Option<f64> {
    let a = dvx * dvx + dvy * dvy;
    if a < EPS {
        return None;
    }
    let b = dpx * dvx + dpy * dvy; // half-b
    if b >= 0.0 {
        return None; // not approaching
    }
    let c = dpx * dpx + dpy * dpy - dist * dist;
    if c <= 0.0 {
        return None; // already inside — let resolution handle it
    }
    let disc = b * b - a * c;
    if disc <= 0.0 {
        return None;
    }
    let tau = (-b - disc.sqrt()) / a;
    if tau > EPS {
        Some(tau)
    } else {
        None
    }
}

pub fn simulate_core(mut balls: Vec<Ball>, mut english: Option<English>, max_time: f64) -> Output {
    let lam = lambda();
    let cue_idx = balls.iter().position(|b| b.id == "cue");
    let mut events: Vec<Event> = Vec::new();
    let mut t_now = 0.0_f64;

    for b in balls.iter_mut() {
        if b.speed() <= V_MIN {
            b.vx = 0.0;
            b.vy = 0.0;
        }
    }

    for _ in 0..10_000 {
        if t_now >= max_time {
            break;
        }

        let tau_stop: Vec<f64> = balls
            .iter()
            .map(|b| {
                if b.pocketed || b.speed() < EPS {
                    f64::INFINITY
                } else {
                    (1.0 - V_MIN / b.speed()).max(0.0) / lam
                }
            })
            .collect();

        let mut best: Option<(f64, Candidate)> = None;
        fn consider(tau: f64, c: Candidate, best: &mut Option<(f64, Candidate)>) {
            if best.as_ref().map_or(true, |(bt, _)| tau < *bt) {
                *best = Some((tau, c));
            }
        }

        for i in 0..balls.len() {
            let b = &balls[i];
            if b.pocketed {
                continue;
            }
            // pair candidates must be examined even when ball i is the
            // stationary one (contact_tau no-ops without relative motion);
            // only the single-ball candidates require ball i itself to move
            for j in (i + 1)..balls.len() {
                let o = &balls[j];
                if o.pocketed {
                    continue;
                }
                if let Some(tau) =
                    contact_tau(b.x - o.x, b.y - o.y, b.vx - o.vx, b.vy - o.vy, BALL_D)
                {
                    if tau <= tau_stop[i].min(tau_stop[j]) {
                        consider(tau, Candidate::Hit(i, j), &mut best);
                    }
                }
            }

            // spin transition is considered even for a stopped cue: draw can
            // re-accelerate a ball that has come to rest
            if let Some((_, _, _, tt)) = b.spin {
                let remaining = (tt - t_now).max(0.0);
                let tau = if remaining <= 0.0 { 0.0 } else { (1.0 - (-lam * remaining).exp()) / lam };
                consider(tau, Candidate::Spin(i), &mut best);
            }

            if b.speed() < EPS {
                continue;
            }
            consider(tau_stop[i], Candidate::Stop, &mut best);

            for (pi, &(_, px, py)) in POCKETS.iter().enumerate() {
                if let Some(tau) = contact_tau(b.x - px, b.y - py, b.vx, b.vy, CAPTURE_R) {
                    if tau <= tau_stop[i] {
                        consider(tau, Candidate::Pocket(i, pi), &mut best);
                    }
                }
            }

            // rails: inside a pocket mouth the cushion gives way — the wall
            // moves out to a backstop line so skimmers cannot escape the table
            let axes: [(bool, f64, f64, &'static str, &'static str); 2] = [
                (true, RAIL_MIN_X, RAIL_MAX_X, "left", "right"),
                (false, RAIL_MIN_Y, RAIL_MAX_Y, "top", "bottom"),
            ];
            for (is_x, lo, hi, lo_name, hi_name) in axes {
                let (p, v) = if is_x { (b.x, b.vx) } else { (b.y, b.vy) };
                if v.abs() < EPS {
                    continue;
                }
                let (line, name) = if v < 0.0 { (lo, lo_name) } else { (hi, hi_name) };
                let back = if v < 0.0 { line - BACKSTOP } else { line + BACKSTOP };
                for line_try in [line, back] {
                    let tau = (line_try - p) / v;
                    if tau <= EPS || tau > tau_stop[i] {
                        continue;
                    }
                    let (cx, cy) = if is_x {
                        (line_try, b.y + b.vy * tau)
                    } else {
                        (b.x + b.vx * tau, line_try)
                    };
                    if line_try == line && in_pocket_mouth(cx, cy) {
                        continue; // open mouth — fall through to the backstop
                    }
                    consider(tau, Candidate::Rail(i, is_x, name), &mut best);
                    break;
                }
            }
        }

        let Some((tau, cand)) = best else { break };
        if !(tau.is_finite() && tau >= 0.0) {
            break;
        }

        // advance everything to the event in closed form
        let decay = (1.0 - lam * tau).max(0.0); // = e^(−λΔt)
        let dt = if decay > 0.0 {
            -decay.ln() / lam
        } else {
            max_time - t_now
        };
        for b in balls.iter_mut() {
            if b.pocketed {
                continue;
            }
            b.x += b.vx * tau;
            b.y += b.vy * tau;
            b.vx *= decay;
            b.vy *= decay;
            if b.speed() <= V_MIN {
                b.vx = 0.0;
                b.vy = 0.0;
            }
        }
        t_now += dt;

        match cand {
            Candidate::Stop => {}
            Candidate::Rail(i, is_x, name) => {
                let b = &mut balls[i];
                if is_x {
                    b.vx = -b.vx * RAIL_COR;
                } else {
                    b.vy = -b.vy * RAIL_COR;
                }
                let n_speed = if is_x { b.vx.abs() } else { b.vy.abs() };
                if n_speed > RAIL_EVENT_MIN_SPEED {
                    events.push(Event {
                        kind: EventKind::Rail(i, name),
                        t: t_now,
                        balls: balls.clone(),
                    });
                }
            }
            Candidate::Pocket(i, pi) => {
                let b = &mut balls[i];
                b.pocketed = true;
                b.vx = 0.0;
                b.vy = 0.0;
                events.push(Event {
                    kind: EventKind::Pocket(i, POCKETS[pi].0),
                    t: t_now,
                    balls: balls.clone(),
                });
            }
            Candidate::Hit(i, j) => {
                let dx = balls[j].x - balls[i].x;
                let dy = balls[j].y - balls[i].y;
                let dist = (dx * dx + dy * dy).sqrt();
                if dist > EPS {
                    let nx = dx / dist;
                    let ny = dy / dist;
                    let dvn = (balls[i].vx - balls[j].vx) * nx + (balls[i].vy - balls[j].vy) * ny;
                    if dvn > 0.0 {
                        // pre-impulse cue velocity = the aim direction, used to
                        // orient the spin curve
                        let cue_pre = cue_idx.map(|ci| (balls[ci].vx, balls[ci].vy));

                        let imp = dvn * BALL_COR;
                        balls[i].vx -= imp * nx;
                        balls[i].vy -= imp * ny;
                        balls[j].vx += imp * nx;
                        balls[j].vy += imp * ny;

                        // collision-induced throw: friction at the contact
                        // imparts a tangential impulse opposing the relative
                        // surface slip, deflecting the struck ball off the pure
                        // line of centers. The normal impulse above is along n,
                        // so it leaves the tangential component untouched — dvt
                        // is the same before or after it. Coulomb-capped at
                        // MU_BALL * |normal impulse|; uncapped it would need
                        // dvt/2 to fully arrest equal-mass tangential slip.
                        let tx = -ny;
                        let ty = nx;
                        let dvt = (balls[i].vx - balls[j].vx) * tx + (balls[i].vy - balls[j].vy) * ty;
                        let jt = (MU_BALL * imp).min(dvt.abs() * 0.5) * dvt.signum();
                        balls[i].vx -= jt * tx;
                        balls[i].vy -= jt * ty;
                        balls[j].vx += jt * tx;
                        balls[j].vy += jt * ty;

                        // english on first cue contact (english.take() => once)
                        if Some(i) == cue_idx || Some(j) == cue_idx {
                            if let Some(e) = english.take() {
                                let (ci, oi) = if Some(i) == cue_idx { (i, j) } else { (j, i) };
                                // side english throws the object ball
                                let throw = e.x * 0.05;
                                let os = balls[oi].speed();
                                let oa = balls[oi].vy.atan2(balls[oi].vx) + throw;
                                balls[oi].vx = oa.cos() * os;
                                balls[oi].vy = oa.sin() * os;

                                if e.x == 0.0 && e.y == 0.0 {
                                    // center ball / stun: cue stops dead
                                    balls[ci].vx *= 0.1;
                                    balls[ci].vy *= 0.1;
                                } else {
                                    // follow/draw: cue slides on the tangent
                                    // (its post-impulse velocity), then a spin
                                    // transition adds a component along the aim
                                    // line. e.y<0 = follow (forward), e.y>0 = draw
                                    if let Some((cvx, cvy)) = cue_pre {
                                        let sp = (cvx * cvx + cvy * cvy).sqrt();
                                        if sp > EPS {
                                            let mag = -e.y * SPIN_GAIN * sp;
                                            balls[ci].spin =
                                                Some((cvx / sp, cvy / sp, mag, t_now + SLIDE_TIME));
                                        }
                                    }
                                }
                            }
                        }
                        events.push(Event {
                            kind: EventKind::Hit(i, j),
                            t: t_now,
                            balls: balls.clone(),
                        });
                    }
                }
            }
            Candidate::Spin(i) => {
                if let Some((dx, dy, mag, _)) = balls[i].spin.take() {
                    if !balls[i].pocketed {
                        balls[i].vx += dx * mag;
                        balls[i].vy += dy * mag;
                        if balls[i].speed() <= V_MIN {
                            balls[i].vx = 0.0;
                            balls[i].vy = 0.0;
                        }
                        events.push(Event {
                            kind: EventKind::Spin(i),
                            t: t_now,
                            balls: balls.clone(),
                        });
                    }
                }
            }
        }

        // don't stop while a spin transition is still pending (draw can
        // re-accelerate a ball that has momentarily come to rest)
        if balls.iter().all(|b| b.pocketed || (b.speed() < EPS && b.spin.is_none())) {
            break;
        }
    }

    Output {
        events,
        final_balls: balls,
        duration: t_now,
    }
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
// Returns a packed u64: (ptr << 32) | len of a UTF-8 JSON string in wasm
// memory. The buffer is leaked per call (harness processes are short-lived).

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
            pocketed: false,
            spin: None,
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
        Ball { id: id.to_string(), x, y, vx, vy, pocketed: false, spin: None }
    }

    fn find_pocket<'a>(o: &'a Output) -> Option<(&'a str, &'a str)> {
        o.events.iter().find_map(|e| match &e.kind {
            EventKind::Pocket(i, name) => Some((e.balls[*i].id.as_str(), *name)),
            _ => None,
        })
    }

    #[test]
    fn straight_roll_into_corner_pocket() {
        let (dx, dy) = (98.5 - 80.0, 48.5 - 37.7);
        let len = (dx * dx + dy * dy).sqrt();
        let out = simulate_core(
            vec![ball("1", 80.0, 37.7, dx / len * 120.0, dy / len * 120.0)],
            None,
            10.0,
        );
        assert_eq!(find_pocket(&out), Some(("1", "corner-br")));
    }

    #[test]
    fn rail_bounce_reflects_at_rail_line() {
        let out = simulate_core(vec![ball("1", 25.0, 25.0, -120.0, 0.0)], None, 10.0);
        let rail = out
            .events
            .iter()
            .find_map(|e| match &e.kind {
                EventKind::Rail(i, name) => Some((&e.balls[*i], *name)),
                _ => None,
            })
            .expect("rail event");
        assert_eq!(rail.1, "left");
        assert!((rail.0.x - RAIL_MIN_X).abs() < 1e-6, "bounced at {}", rail.0.x);
    }

    #[test]
    fn head_on_stun_pockets_object_ball_and_holds_cue() {
        let dirx = (98.5 - 80.0) / 21.418;
        let diry = (48.5 - 37.7) / 21.418;
        let out = simulate_core(
            vec![
                ball("cue", 80.0 - 15.0 * dirx, 37.7 - 15.0 * diry, dirx * 200.0, diry * 200.0),
                ball("1", 80.0, 37.7, 0.0, 0.0),
            ],
            Some(English { x: 0.0, y: 0.0 }),
            10.0,
        );
        let hit = out
            .events
            .iter()
            .find(|e| matches!(e.kind, EventKind::Hit(..)))
            .expect("contact");
        let cue_at_hit = hit.balls.iter().find(|b| b.id == "cue").unwrap().clone();
        let one_at_hit = hit.balls.iter().find(|b| b.id == "1").unwrap();
        let gap = ((one_at_hit.x - cue_at_hit.x).powi(2) + (one_at_hit.y - cue_at_hit.y).powi(2)).sqrt();
        assert!((gap - BALL_D).abs() < 1e-6, "contact gap {}", gap);
        assert_eq!(find_pocket(&out), Some(("1", "corner-br")));
        let fin_cue = out.final_balls.iter().find(|b| b.id == "cue").unwrap();
        assert!(!fin_cue.pocketed, "cue must not scratch");
        let drift = ((fin_cue.x - cue_at_hit.x).powi(2) + (fin_cue.y - cue_at_hit.y).powi(2)).sqrt();
        assert!(drift < 4.0, "stun cue drifted {}", drift);
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
        let out = simulate_core(vec![ball("1", 25.0, 25.0, -120.0, 0.0)], None, 10.0);
        let json = output_to_json(&out);
        assert!(json.starts_with("{\"events\":["));
        assert!(json.contains("\"final\":"));
        assert!(json.contains("\"rail\":\"left\""));
    }
}
