import { test, expect } from '../setup/test-helpers';

/**
 * The aim visuals must agree with each other, and must follow an interactive selection.
 *
 * Written because real use reported the opposite: after selecting a ball and pocket the cue stick
 * still pointed the old way while the other aids had moved, and the shot then went past the object
 * ball. Nothing asserted the cue stick at all, and every existing shot check sets its selection up
 * front in the URL hash - so neither the stick nor the selection-change path was covered.
 *
 * These are geometric checks, not "it exists": the shaft's polygon is read back and compared with
 * the ghost line, immediately after each change, which is the timing that was reported.
 */
test.describe('Aim consistency', () => {
  test('shaft axis agrees with the ghost line, and the tip stays at the cue ball', async ({ page, aceHelper }) => {
    await aceHelper.gotoEmpty();
    await aceHelper.dragBallToTable(0, 56.8, 6.5);   // the cue ball: without it the stick stays hidden
    await aceHelper.dragBallToTable(1, 70, 30);
    await aceHelper.dragBallToTable(2, 60, 12);
    await aceHelper.selectObjectBall(1);
    await aceHelper.minimizePalette('balls'); // it covers the top-left pocket

    for (const [ball, pocket] of [[1, 'corner-br'], [2, 'corner-tr'], [1, 'side-bottom']] as const) {
      await aceHelper.selectObjectBall(ball);
      await aceHelper.selectPocket(pocket);

      // read on the very next turn: the report was about a lag, not a permanent mismatch
      const aim = await page.evaluate(() => {
        const debug = (window as unknown as { DEBUG: { cue(): { x: number; y: number } } }).DEBUG;
        // the ghost line is a <path> ("M x1 y1 L x2 y2"), so read its geometry from `d`
        const d = document.getElementById('cue-ghost-line')?.getAttribute('d') || '';
        const [, gx1, gy1, gx2, gy2] = (d.match(/M\s*([-\d.]+)[ ,]+([-\d.]+)\s*L\s*([-\d.]+)[ ,]+([-\d.]+)/) || []).map(Number);
        const points = (document.getElementById('cue-shaft')?.getAttribute('points') || '').trim().split(/\s+/).map(Number);
        // four shaft corners: ferrule-left, ferrule-right, butt-right, butt-left
        const corner = (i: number) => ({ x: points[i * 2], y: points[i * 2 + 1] });
        const [ferruleLeft, ferruleRight, buttRight, buttLeft] = [corner(0), corner(1), corner(2), corner(3)];
        const tip = document.getElementById('cue-tip');
        return {
          cue: debug.cue(),
          ghost: { x1: gx1, y1: gy1, x2: gx2, y2: gy2 },
          ferruleEnd: { x: (ferruleLeft.x + ferruleRight.x) / 2, y: (ferruleLeft.y + ferruleRight.y) / 2 },
          butt: { x: (buttRight.x + buttLeft.x) / 2, y: (buttRight.y + buttLeft.y) / 2 },
          tip: { x: Number(tip?.getAttribute('cx')), y: Number(tip?.getAttribute('cy')) },
          stickVisible: document.getElementById('cue-stick')?.getAttribute('visibility') ?? null,
        };
      });

      expect(aim.stickVisible, `stick shown for ball ${ball} -> ${pocket}`).toBe('visible');
      expect(Number.isFinite(aim.ferruleEnd.x) && Number.isFinite(aim.butt.x), 'shaft polygon readable').toBe(true);

      // the stick runs butt -> ferrule -> ghost, so that direction is the aim axis
      const stick = { x: aim.ferruleEnd.x - aim.butt.x, y: aim.ferruleEnd.y - aim.butt.y };
      const ghost = { x: aim.ghost.x2 - aim.ghost.x1, y: aim.ghost.y2 - aim.ghost.y1 };
      const stickLength = Math.hypot(stick.x, stick.y);
      const ghostLength = Math.hypot(ghost.x, ghost.y);
      const dot = (stick.x * ghost.x + stick.y * ghost.y) / (stickLength * ghostLength);
      const angleDeg = Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;
      expect(angleDeg, `stick vs ghost line for ball ${ball} -> ${pocket}`).toBeLessThan(1);

      // the tip sits 0.8 units behind the cue ball, on the opposite side from the aim
      const tipToCue = Math.hypot(aim.tip.x - aim.cue.x, aim.tip.y - aim.cue.y);
      expect(Math.abs(tipToCue - 0.8), `tip-to-cue distance for ball ${ball} -> ${pocket}`).toBeLessThan(0.05);
      const cueToTip = { x: (aim.tip.x - aim.cue.x) / tipToCue, y: (aim.tip.y - aim.cue.y) / tipToCue };
      const tipDot = cueToTip.x * (ghost.x / ghostLength) + cueToTip.y * (ghost.y / ghostLength);
      expect(tipDot, `tip sits behind the cue ball for ball ${ball} -> ${pocket}`).toBeLessThan(-0.99);

    }
  });
});
