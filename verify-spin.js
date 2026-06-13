// Validates the spin/curve model in the core: on a straight shot, follow
// (top spin) must roll the cue forward past the contact point and draw
// (bottom spin) must pull it back, with a spin transition event emitted.
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

const follow = shot(-0.5) // top spin
const draw = shot(0.5)    // bottom spin
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
  fSpin && dSpin && !sSpin    // spin transition only with english

console.log(ok ? 'PASS' : 'FAIL')
process.exit(ok ? 0 : 1)
