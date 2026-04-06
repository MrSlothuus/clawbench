#!/usr/bin/env node

const { parseArgs } = require('node:util');
const sandbox = require('../src/sandbox');
const { runSuite } = require('../src/runner');
const { printTerminal, printDryRun, writeJson } = require('../src/reporter');
const { getAllTestCases } = require('../src/categories');

const c = { reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m', red: '\x1b[31m', green: '\x1b[32m', cyan: '\x1b[36m' };

const USAGE = `
${c.bold}${c.cyan}ClawBench${c.reset} — Agent Orchestration Benchmark

${c.bold}USAGE${c.reset}
  npx clawbench [options]

${c.bold}OPTIONS${c.reset}
  --api-url <url>       API endpoint (default: http://localhost:18789)
  --model <name>        Model identifier (required for run)
  --api-key <key>       API key (prefer OPENAI_API_KEY env var)
  --timeout <seconds>   Per-test timeout in seconds (default: 60)
  --only <category>     Run only a specific category
  --ci                  CI mode: JSON output only, exit code based on threshold
  --threshold <score>   Minimum score for CI pass (default: 70)
  --dry-run             List all test cases without running
  --keep-sandbox        Don't clean up temp directory after run
  --sandbox-dir <path>  Custom sandbox directory path
  --output <path>       Write JSON scorecard to file
  --help                Show this help message

${c.bold}ENVIRONMENT${c.reset}
  OPENAI_API_KEY        API key (preferred over --api-key flag)
  CLAWBENCH_API_URL     Default API URL

${c.bold}EXAMPLES${c.reset}
  npx clawbench --dry-run
  npx clawbench --api-url http://localhost:18789 --model anthropic/claude-sonnet-4-6
  npx clawbench --ci --threshold 80 --model gpt-4o
  npx clawbench --only tool-accuracy --model anthropic/claude-sonnet-4-6

${c.bold}SCORE GUIDE${c.reset}
  90-100  Excellent — agent handles complex orchestration reliably
  70-89   Solid — agent works well for most tasks
  40-69   Functional — agent works but has gaps
  0-39    Needs work — significant agent capability issues
`;

function parseCliArgs() {
  try {
    const { values } = parseArgs({
      options: {
        'api-url': { type: 'string' },
        'model': { type: 'string' },
        'api-key': { type: 'string' },
        'timeout': { type: 'string' },
        'only': { type: 'string' },
        'ci': { type: 'boolean', default: false },
        'threshold': { type: 'string' },
        'dry-run': { type: 'boolean', default: false },
        'keep-sandbox': { type: 'boolean', default: false },
        'sandbox-dir': { type: 'string' },
        'output': { type: 'string' },
        'help': { type: 'boolean', default: false },
      },
      strict: true,
    });
    return values;
  } catch (err) {
    console.error(`${c.red}Error: ${err.message}${c.reset}`);
    console.error(`Run with --help for usage information.`);
    process.exit(1);
  }
}

async function main() {
  const args = parseCliArgs();

  if (args.help) {
    console.log(USAGE);
    process.exit(0);
  }

  // Gather all test cases
  let testCases = getAllTestCases();

  // Filter by category if --only specified
  if (args.only) {
    const filtered = testCases.filter(tc => tc.category === args.only);
    if (filtered.length === 0) {
      const cats = [...new Set(testCases.map(t => t.category))];
      console.error(`${c.red}Error: Unknown category "${args.only}"${c.reset}`);
      console.error(`Available categories: ${cats.join(', ')}`);
      process.exit(1);
    }
    testCases = filtered;
  }

  // Dry run mode
  if (args['dry-run']) {
    printDryRun(testCases);
    process.exit(0);
  }

  // Validate required args for actual run
  const apiUrl = args['api-url'] || process.env.CLAWBENCH_API_URL || 'http://localhost:18789';
  const model = args.model;
  const apiKey = args['api-key'] || process.env.OPENAI_API_KEY || '';
  const timeoutMs = (parseInt(args.timeout, 10) || 60) * 1000;
  const threshold = parseInt(args.threshold, 10) || 70;
  const ci = args.ci;
  const keepSandbox = args['keep-sandbox'];

  if (!model) {
    console.error(`${c.red}Error: --model is required for running benchmarks${c.reset}`);
    console.error(`Example: npx clawbench --model anthropic/claude-sonnet-4-6`);
    process.exit(1);
  }

  // Create sandbox
  const sandboxRoot = sandbox.create(args['sandbox-dir']);
  sandbox.registerCleanupHandlers(keepSandbox);

  if (!ci) {
    console.log('');
    console.log(`${c.bold}${c.cyan}ClawBench${c.reset} — Starting benchmark suite`);
    console.log(`${c.dim}  API:     ${apiUrl}${c.reset}`);
    console.log(`${c.dim}  Model:   ${model}${c.reset}`);
    console.log(`${c.dim}  Sandbox: ${sandboxRoot}${c.reset}`);
    console.log(`${c.dim}  Tests:   ${testCases.length}${c.reset}`);
    console.log(`${c.dim}  Timeout: ${timeoutMs / 1000}s per test${c.reset}`);
    console.log('');
  }

  // Run
  let completed = 0;
  const scorecard = await runSuite(testCases, {
    apiUrl,
    model,
    apiKey,
    timeoutMs,
    onResult: (result) => {
      completed++;
      if (!ci) {
        const icon = result.passed ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
        const progress = `${c.dim}[${completed}/${testCases.length}]${c.reset}`;
        console.log(`  ${progress} ${icon} ${result.description}`);
      }
    },
  });

  // Output
  if (ci) {
    console.log(JSON.stringify(scorecard, null, 2));
  } else {
    printTerminal(scorecard);
  }

  // Write JSON if requested
  if (args.output) {
    writeJson(scorecard, args.output);
    if (!ci) console.log(`${c.dim}Scorecard written to ${args.output}${c.reset}`);
  }

  // Cleanup
  if (!keepSandbox) {
    sandbox.cleanup();
  } else if (!ci) {
    console.log(`${c.dim}Sandbox preserved at ${sandboxRoot}${c.reset}`);
  }

  // CI exit code
  if (ci) {
    process.exit(scorecard.totalScore >= threshold ? 0 : 1);
  }
}

main().catch(err => {
  console.error(`${c.red}Fatal: ${err.message}${c.reset}`);
  sandbox.cleanup();
  process.exit(1);
});
