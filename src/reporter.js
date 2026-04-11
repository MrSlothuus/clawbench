const fs = require('fs');
const path = require('path');

// ANSI color helpers
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
  bgYellow: '\x1b[43m',
};

function scoreColor(score, max) {
  const pct = max > 0 ? score / max : 0;
  if (pct >= 0.8) return c.green;
  if (pct >= 0.5) return c.yellow;
  return c.red;
}

function scoreBadge(totalScore, maxScore) {
  const pct = maxScore > 0 ? totalScore / maxScore : 0;
  if (pct >= 0.9) return `${c.bgGreen}${c.bold} EXCELLENT ${c.reset}`;
  if (pct >= 0.7) return `${c.bgGreen}${c.bold} SOLID ${c.reset}`;
  if (pct >= 0.4) return `${c.bgYellow}${c.bold} FUNCTIONAL ${c.reset}`;
  return `${c.bgRed}${c.bold} NEEDS WORK ${c.reset}`;
}

function printTerminal(scorecard) {
  const { totalScore, maxScore, categories, results, model, timestamp, discoveredModel } = scorecard;

  console.log('');
  console.log(`${c.bold}${c.cyan}╔══════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}${c.cyan}║          🔬 ClawBench Scorecard                  ║${c.reset}`);
  console.log(`${c.bold}${c.cyan}╚══════════════════════════════════════════════════╝${c.reset}`);
  console.log('');
  const displayModel = discoveredModel || model;
  console.log(`  ${c.dim}Model:${c.reset}     ${displayModel}${discoveredModel ? ` ${c.dim}(discovered)${c.reset}` : ''}`);
  console.log(`  ${c.dim}Timestamp:${c.reset} ${timestamp}`);
  console.log('');

  // Overall score
  const sc = scoreColor(totalScore, maxScore);
  console.log(`  ${c.bold}Overall Score: ${sc}${totalScore}/${maxScore}${c.reset}  ${scoreBadge(totalScore, maxScore)}`);
  console.log('');

  // Category breakdown
  console.log(`  ${c.bold}Category Breakdown:${c.reset}`);
  console.log(`  ${'─'.repeat(50)}`);

  for (const [name, cat] of Object.entries(categories)) {
    const cc = scoreColor(cat.score, cat.maxPoints);
    const bar = progressBar(cat.score, cat.maxPoints, 20);
    console.log(`  ${name.padEnd(24)} ${cc}${String(cat.score).padStart(2)}/${cat.maxPoints}${c.reset}  ${bar}  ${c.dim}(${cat.testsPassed}/${cat.testsTotal} passed)${c.reset}`);
  }

  console.log('');

  // Individual results
  console.log(`  ${c.bold}Test Results:${c.reset}`);
  console.log(`  ${'─'.repeat(50)}`);

  for (const r of results) {
    const icon = r.passed ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
    const latency = `${c.dim}${r.latencyMs}ms${c.reset}`;
    console.log(`  ${icon} ${r.description.substring(0, 40).padEnd(40)} ${latency}`);
    if (r.error) {
      console.log(`    ${c.red}Error: ${r.error}${c.reset}`);
    } else if (!r.passed && r.reason) {
      console.log(`    ${c.yellow}${r.reason}${c.reset}`);
    }
  }

  console.log('');

  // Score interpretation
  console.log(`  ${c.bold}Score Guide:${c.reset}`);
  console.log(`  ${c.dim}  90-100  Excellent — agent handles complex orchestration reliably${c.reset}`);
  console.log(`  ${c.dim}  70-89   Solid — agent works well for most tasks${c.reset}`);
  console.log(`  ${c.dim}  40-69   Functional — agent works but has gaps${c.reset}`);
  console.log(`  ${c.dim}  0-39    Needs work — significant agent capability issues${c.reset}`);
  console.log('');
}

function progressBar(value, max, width) {
  const pct = max > 0 ? value / max : 0;
  const filled = Math.round(pct * width);
  const empty = width - filled;
  const color = scoreColor(value, max);
  return `${color}${'█'.repeat(filled)}${c.dim}${'░'.repeat(empty)}${c.reset}`;
}

function printDryRun(testCases) {
  console.log('');
  console.log(`${c.bold}${c.cyan}ClawBench — Dry Run${c.reset}`);
  console.log(`${c.dim}${testCases.length} test cases across ${new Set(testCases.map(t => t.category)).size} categories${c.reset}`);
  console.log('');

  let currentCat = '';
  for (const tc of testCases) {
    if (tc.category !== currentCat) {
      currentCat = tc.category;
      console.log(`  ${c.bold}${currentCat}${c.reset}`);
    }
    console.log(`    ${c.dim}[${tc.maxPoints}pts]${c.reset} ${tc.description}`);
  }

  console.log('');
  const total = testCases.reduce((s, t) => s + t.maxPoints, 0);
  console.log(`  ${c.bold}Total: ${total} points${c.reset}`);
  console.log('');
}

function writeJson(scorecard, outputPath) {
  const dir = path.dirname(outputPath);
  if (dir !== '.') fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(scorecard, null, 2) + '\n');
}

module.exports = { printTerminal, printDryRun, writeJson };
