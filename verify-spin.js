// Validates the spin/curve model in the core: on a straight shot, follow
// (top spin) must roll the cue forward past the contact point and draw
// (bottom spin) must pull it back.
//
// The english values are the smallest that clear those thresholds, measured over
// the core (follow: ey=-0.5 ends +2.93 - just short; -0.6 ends +3.17. draw: +0.7
// ends -1.72; +0.8 ends -3.96). They used to be +-0.5, which sat just under both
// thresholds - the model was never at fault, the setup never reached the claim.
//
// `spin` events are the slide->roll transition the core emits per ball
// (ace-physics/src/lib.rs:441-443, `was_sliding && !sliding`). Any struck ball
// slides before it rolls, so an event also fires for a centre-ball stun shot: the
// old assertion `!sSpin` encoded "no english -> no event", which the event's
// meaning does not support. Asserting the transition exists for the follow and draw
// shots is what the model actually promises.
import { simulate } from './ace-physics-node.js'

const BALL_D = 2.25
// cue heads +x into the 1; low speed so the 1 stops before bouncing back
function shot(ey) {
  return simulate(
    { cue: { x: 30, y: 25, vx: 45, vy: 0 }, '1': { x: 45, y: 25 } },
    { x: 0, y: ey }
  )
}
const contactX = 45 - BALL_D // ~42.75

const follow = shot(-0.6) // top spin (measured: -0.5 ends +2.93, short of +3)
const draw = shot(0.8)    // bottom spin (measured: +0.7 ends -1.72, short of -3)
const stun = shot(0.0)    // center ball

const fx = follow.final['cue'].x
const dx = draw.final['cue'].x
const sx = stun.final['cue'].x
const fSpin = follow.events.some(e => e.type === 'spin')
const dSpin = draw.events.some(e => e.type === 'spin')
const sSpin = stun.events.some(e => e.type === 'spin')

console.log(`contact x ~ ${contactX.toFixed(1)}`)
console.log(`follow cue final x = ${fx.toFixed(1)}  (spin event: ${fSpin})`)
console.log(`draw   cue final x = ${dx.toFixed(1)}  (spin event: ${dSpin})`)
console.log(`stun   cue final x = ${sx.toFixed(1)}  (spin event: ${sSpin})`)

const ok =
  fx > contactX + 3 &&        // follow rolls forward
  dx < contactX - 3 &&        // draw pulls back
  Math.abs(sx - contactX) < 3 && // stun stays put
  fSpin && dSpin              // the slide->roll transition is reported for both

console.log(ok ? 'PASS' : 'FAIL')
process.exit(ok ? 0 : 1)
