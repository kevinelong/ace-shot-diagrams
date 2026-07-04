// Generates the ASCII version of the Columbia Cue Club July 2026 calendar
// (transcribed from the whiteboard) and writes it to july-2026-ascii.txt.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const CELL_W = 13; // inner width of each day cell
const COLS = 7;

const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

// One entry per week (Sun..Sat), matching the whiteboard: Jul 5 - Aug 8, 2026.
// Each cell: { d: date label, lines: [event lines] }
const weeks = [
  [
    { d: '5' },
    { d: '6', lines: ['7:00 PM', 'BCA'] },
    { d: '7' },
    { d: '8', lines: ['6:30 PM', 'OPEN TOURNY'] },
    { d: '9', lines: ['7:00 PM', 'APA'] },
    { d: '10' },
    { d: '11', lines: ['LADIES', '3-PERSON', 'TEAMS!!!'] },
  ],
  [
    { d: '12', lines: ['2 PM SHARP!', 'OPEN TOURNY', '(2ND SUNDAY)', 'LADIES TEAMS'], star: true },
    { d: '13', lines: ['7:00 PM', 'BCA'] },
    { d: '14' },
    { d: '15', lines: ['6:30 PM', 'OPEN TOURNY'] },
    { d: '16', lines: ['7:00 PM', 'APA'] },
    { d: '17' },
    { d: '18' },
  ],
  [
    { d: '19' },
    { d: '20', lines: ['7:00 PM', 'BCA'] },
    { d: '21' },
    { d: '22', lines: ['6:30 PM', 'OPEN TOURNY'] },
    { d: '23', lines: ['7:00 PM', 'APA'] },
    { d: '24' },
    { d: '25' },
  ],
  [
    { d: '26' },
    { d: '27', lines: ['7:00 PM', 'BCA'] },
    { d: '28' },
    { d: '29', lines: ['6:30 PM', 'OPEN TOURNY'] },
    { d: '30', lines: ['7:00 PM', 'APA'] },
    { d: '31' },
    { d: 'AUG 1' },
  ],
  [
    { d: 'AUG 2' },
    { d: 'AUG 3', lines: ['7:00 PM', 'BCA'] },
    { d: 'AUG 4' },
    { d: 'AUG 5', lines: ['6:30 PM', 'OPEN TOURNY'] },
    { d: 'AUG 6', lines: ['7:00 PM', 'APA'] },
    { d: 'AUG 7' },
    { d: 'AUG 8' },
  ],
];

const pad = (s = '', w = CELL_W) => (' ' + s).padEnd(w).slice(0, w);
const center = (s = '', w = CELL_W) => {
  const left = Math.floor((w - s.length) / 2);
  return (' '.repeat(Math.max(0, left)) + s).padEnd(w).slice(0, w);
};

const sep = '+' + Array(COLS).fill('-'.repeat(CELL_W)).join('+') + '+';
const width = sep.length;
const out = [];

// Banner
const bar = '+' + '='.repeat(width - 2) + '+';
const bline = (s) => '|' + center(s, width - 2) + '|';
out.push(bar);
out.push(bline(''));
out.push(bline('C O L U M B I A   C U E   C L U B'));
out.push(bline('~ SUMMER POOL EVENTS ~'));
out.push(bline(''));
out.push(bline('J U L Y   2 0 2 6'));
out.push(bline(''));
out.push(bar);

// Day-of-week header
out.push(sep);
out.push('|' + DAYS.map((d) => center(d)).join('|') + '|');
out.push(sep.replace(/-/g, '='));

// Weeks
const EVENT_ROWS = 4;
for (const week of weeks) {
  // date row (starred cells get a marker)
  out.push('|' + week.map((c) => pad((c.star ? '*' : '') + c.d)).join('|') + '|');
  for (let r = 0; r < EVENT_ROWS; r++) {
    out.push('|' + week.map((c) => center((c.lines || [])[r] || '')).join('|') + '|');
  }
  out.push(sep);
}

// Notes footer
out.push('');
out.push(' NOTES' + ' ' + '-'.repeat(width - 7));
out.push('  * JUL 11 + 12 ...... LADIES 3-PERSON TEAMS!!!');
out.push('  * OPEN TOURNY ...... 2ND SUNDAY @ 2 PM SHARP!  +  EVERY WED 6:30 PM, ALL SUMMER');
out.push('  * WEEKLY ........... MON 7 PM BCA  |  WED 6:30 PM OPEN TOURNY  |  THU 7 PM APA');
out.push('  * WATCH ............ COLUMBIA CUE CLUB');
out.push('  * CONTACT .......... kevin@columbiacueclub.com  |  SMS 503-888-6879');
out.push('');
out.push(' ' + '-'.repeat(width - 2));
out.push('   ( o )  RACK \'EM UP!   ( 8 )');
out.push('');

const text = out.join('\n');
const here = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(here, 'july-2026-ascii.txt'), text);
console.log(text);
