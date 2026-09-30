// One place that knows how to launch a browser for the standalone harnesses.
//
// Eleven scripts used to carry their own copy of this, and four had drifted to a hardcoded
// /usr/bin/chromium path that exists on no machine here - so they could not run at all, which is
// why ci.yml listed them as deliberately excluded for months.
//
// The rule: CHROMIUM_PATH wins when set (a system browser); otherwise omit executablePath so
// playwright-core resolves the browser it manages. Written as CommonJS because both families use
// it - the .cjs harnesses by require, the ESM ones by default import.
//
//   const { launchHarnessBrowser } = require('./harness-browser.cjs')
//   const browser = await launchHarnessBrowser()

const { chromium } = require('playwright-core')

/** Launch options for a harness: sane defaults, CHROMIUM_PATH when the caller set one. */
function launchOptions(extra = {}) {
  const options = { args: ['--no-sandbox', '--disable-gpu'], ...extra }
  if (process.env.CHROMIUM_PATH) options.executablePath = process.env.CHROMIUM_PATH
  return options
}

/** Launch a browser for a harness. */
async function launchHarnessBrowser(extra = {}) {
  return chromium.launch(launchOptions(extra))
}

module.exports = { launchOptions, launchHarnessBrowser }
