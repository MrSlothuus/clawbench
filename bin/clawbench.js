#!/usr/bin/env node

const { parseArgs } = require('node:util');
const sandbox = require('../src/sandbox');
const { runSuite } = require('../src/runner');
const { printTerminal, printDryRun, writeJson } = require('../src/reporter');
const { getAllTestCases } = require('../src/categories');

const c = { reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m', red: '\x1b[31m', green: '\x1b[32m', cyan: '\x1b[36m' };

const USAGE = `
${c.bold}${c.cyan}ClawBench${c.reset} — Agent Orchestration Benchmark

Tests AI models through the OpenClaw gateway — the full agent stack,
not raw API calls. Ensures thinking-block stripping, retry logic, and
orchestration middleware are all included in the benchmark.

${c.bold}USAGE${c.reset}
  npx clawbench [options]

${c.bold}OPTIONS${c.reset}
  --gateway-url <url>   OpenClaw gateway URL (default: http://localhost:18789)
  --gateway-token <tok> OpenClaw gateway bearer token (auto-detected from ~/.openclaw/openclaw.json)
  --model <name>        Model override via x-openclaw-model header (optional)
                        Omit to use the agent's configured default model.
                        Examples: minimax-portal/MiniMax-M2.7, anthropic/claude-sonnet-4-6
  --agent <id>          Target agent (default: openclaw/default)
  --agent-name <name>   Override agent display name (auto-detected from OpenClaw config)
  --timeout <seconds>   Per-test timeout in seconds (default: 90)
  --only <category>     Run only a specific category
  --ci                  CI mode: JSON output only, exit code based on threshold
  --threshold <score>   Minimum score for CI pass (default: 70)
  --dry-run             List all test cases without running
  --keep-sandbox        Don't clean up temp directory after run
  --sandbox-dir <path>  Custom sandbox directory path
  --output <path>       Write JSON scorecard to file
  --submit              Submit results to clawbench.club leaderboard
  --submit-url <url>    Custom submission URL (default: https://clawbench.club)
  --update              Pull latest changes and reinstall (self-update)
  --help                Show this help message

${c.bold}ENVIRONMENT${c.reset}
  OPENCLAW_GATEWAY_TOKEN  Gateway bearer token (preferred over --gateway-token)
  CLAWBENCH_GATEWAY_URL   Default gateway URL

${c.bold}EXAMPLES${c.reset}
  npx clawbench --dry-run
  clawbench --gateway-token ba8eaef230bc8e8b8729e64e973477c2700a4cb68a8dc69e
  npx clawbench --model minimax-portal/MiniMax-M2.7 --gateway-token <token>
  npx clawbench --model anthropic/claude-sonnet-4-6 --gateway-token <token>
  npx clawbench --only tool-accuracy --gateway-token <token>
  npx clawbench --submit --gateway-token <token>

${c.bold}SCORE GUIDE${c.reset}
  90-100  Excellent — agent handles complex orchestration reliably
  70-89   Solid — agent works well for most tasks
  40-69   Functional — agent works but has gaps
  0-39    Needs work — significant agent capability issues
`;

/**
 * Detect the agent's display name from OpenClaw configuration.
 * 1. Parse ~/.openclaw/openclaw.json → agents.list → find by id → use `name`
 * 2. Try IDENTITY.md in the agent dir for a Name field
 * 3. Fall back to null (caller can use agentTarget string)
 */
function detectAgentName(agentTarget) {
  const os = require('os');
  const path = require('path');
  const fs = require('fs');

  // Extract the agent id from target like "openclaw/default" or "openclaw/neo"
  const agentId = agentTarget.includes('/') ? agentTarget.split('/').pop() : agentTarget;

  try {
    const openclawCfg = path.join(os.homedir(), '.openclaw', 'openclaw.json');
    if (!fs.existsSync(openclawCfg)) return null;

    const cfg = JSON.parse(fs.readFileSync(openclawCfg, 'utf8'));
    const agentsList = cfg?.agents?.list || [];

    // For "default", find the first agent in the list (typically "main")
    let agentEntry;
    if (agentId === 'default') {
      agentEntry = agentsList.find(a => a.id === 'main') || agentsList[0];
    } else {
      agentEntry = agentsList.find(a => a.id === agentId);
    }

    if (agentEntry?.name) return agentEntry.name;

    // Try IDENTITY.md in the agent dir
    const agentDir = agentEntry?.agentDir || path.join(os.homedir(), '.openclaw', 'agents', agentEntry?.id || agentId, 'agent');
    const identityPath = path.join(agentDir, 'IDENTITY.md');
    if (fs.existsSync(identityPath)) {
      const content = fs.readFileSync(identityPath, 'utf8');
      const nameMatch = content.match(/^-\s*\*\*Name:\*\*\s*(.+)$/m) ||
                        content.match(/^#\s+(.+)/m);
      if (nameMatch) return nameMatch[1].trim();
    }

    // Try workspace IDENTITY.md (e.g. ~/clawd/IDENTITY.md)
    if (agentEntry?.workspace) {
      const wsIdentity = path.join(agentEntry.workspace, 'IDENTITY.md');
      if (fs.existsSync(wsIdentity)) {
        const content = fs.readFileSync(wsIdentity, 'utf8');
        const nameMatch = content.match(/^-\s*\*\*Name:\*\*\s*(.+)$/m) ||
                          content.match(/^#\s+.+[\s\S]*?-\s*\*\*Name:\*\*\s*(.+)$/m);
        if (nameMatch) return (nameMatch[1] || nameMatch[0]).trim();
        // Also try simple "Name:" pattern without asterisks
        const simpleMatch = content.match(/^Name:\s*(.+)$/m);
        if (simpleMatch) return simpleMatch[1].trim();
      }
    }
  } catch (_) {
    // Detection is best-effort
  }

  // Special case: "default" agent maps to Morpheus (workspace ~/clawd)
  // The main agent's workspace is ~/clawd which has IDENTITY.md with Name: Morpheus
  if (agentId === 'default' || agentId === 'main') {
    const morpheusIdentity = path.join(os.homedir(), 'clawd', 'IDENTITY.md');
    if (fs.existsSync(morpheusIdentity)) {
      const content = fs.readFileSync(morpheusIdentity, 'utf8');
      const nameMatch = content.match(/^-\s*\*\*Name:\*\*\s*(.+)$/m);
      if (nameMatch) return nameMatch[1].trim();
    }
  }

  return null;
}

function parseCliArgs() {
  try {
    const { values } = parseArgs({
      options: {
        'gateway-url': { type: 'string' },
        'gateway-token': { type: 'string' },
        'model': { type: 'string' },
        'agent': { type: 'string' },
        'agent-name': { type: 'string' },
        // legacy aliases kept for compatibility
        'api-url': { type: 'string' },
        'api-key': { type: 'string' },
        'timeout': { type: 'string' },
        'only': { type: 'string' },
        'ci': { type: 'boolean', default: false },
        'threshold': { type: 'string' },
        'dry-run': { type: 'boolean', default: false },
        'keep-sandbox': { type: 'boolean', default: false },
        'sandbox-dir': { type: 'string' },
        'output': { type: 'string' },
        'submit': { type: 'boolean', default: false },
        'submit-url': { type: 'string' },
        'update': { type: 'boolean', default: false },
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

  // Show help and exit
  if (args.help) {
    console.log(USAGE);
    process.exit(0);
  }

  // Self-update: git pull + npm install + npm link
  if (args.update) {
    const { execSync } = require('child_process');
    const os = require('os');
    const path = require('path');
    const fs = require('fs');

    // Resolve the actual repo path: find where this binary lives, go up 2 levels to package root
    // Handles both global npm link (/opt/homebrew/lib/node_modules/clawbench → project) and local runs
    let repoDir;
    try {
      const pkgPath = require.resolve('clawbench/package.json');
      repoDir = path.dirname(path.dirname(pkgPath));
    } catch (_) {
      // Fallback: resolve from the binary's location
      const binPath = __filename; // this file is at <repo>/bin/clawbench.js
      repoDir = path.dirname(path.dirname(binPath));
    }
    console.log(`${c.bold}${c.cyan}ClawBench — Self-Update${c.reset}`);
    console.log(`${c.dim}  Repo: ${repoDir}${c.reset}\n`);

    try {
      console.log(`${c.dim}Fetching...${c.reset}`);
      execSync('git fetch origin', { cwd: repoDir, stdio: 'pipe' });

      const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: repoDir, encoding: 'utf8' }).trim();
      const localCommit = execSync('git rev-parse HEAD', { cwd: repoDir, encoding: 'utf8' }).trim();
      const remoteCommit = execSync(`git rev-parse origin/${currentBranch}`, { cwd: repoDir, encoding: 'utf8' }).trim();

      if (localCommit === remoteCommit) {
        console.log(`  ${c.green}Already up to date (${currentBranch}, ${localCommit.slice(0, 7)})${c.reset}`);
        process.exit(0);
      }

      console.log(`${c.dim}Pulling...${c.reset}`);
      execSync(`git pull origin ${currentBranch}`, { cwd: repoDir, stdio: 'pipe' });

      console.log(`${c.dim}Installing...${c.reset}`);
      execSync('npm install', { cwd: repoDir, stdio: 'pipe' });

      console.log(`${c.dim}Relinking...${c.reset}`);
      execSync('npm link', { cwd: repoDir, stdio: 'pipe' });

      const newVersion = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8')).version;
      const newCommit = execSync('git rev-parse HEAD', { cwd: repoDir, encoding: 'utf8' }).trim();

      console.log(`\n  ${c.green}${c.bold}Updated to ${newVersion} (${newCommit.slice(0, 7)})${c.reset}`);
    } catch (err) {
      console.error(`${c.red}Update failed: ${err.message}${c.reset}`);
      process.exit(1);
    }
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
  const gatewayUrl = args['gateway-url'] || args['api-url'] || process.env.CLAWBENCH_GATEWAY_URL || 'http://localhost:18789';

  // Auto-detect token: flag → env var → ~/.openclaw/openclaw.json
  let gatewayToken = args['gateway-token'] || args['api-key'] || process.env.OPENCLAW_GATEWAY_TOKEN || '';
  if (!gatewayToken) {
    try {
      const os = require('os');
      const path = require('path');
      const fs = require('fs');
      const openclawCfg = path.join(os.homedir(), '.openclaw', 'openclaw.json');
      if (fs.existsSync(openclawCfg)) {
        const cfg = JSON.parse(fs.readFileSync(openclawCfg, 'utf8'));
        gatewayToken = cfg?.gateway?.auth?.token || '';
      }
    } catch (_) {}
  }
  const modelOverride = args.model || null; // optional — sent as x-openclaw-model header
  const agentTarget = args.agent || 'openclaw/default';
  const agentName = args['agent-name'] || detectAgentName(agentTarget);
  const timeoutMs = (parseInt(args.timeout, 10) || 90) * 1000;
  const threshold = parseInt(args.threshold, 10) || 70;
  const ci = args.ci;
  const keepSandbox = args['keep-sandbox'];

  // Token required only for actual benchmark runs (not --submit which only talks to leaderboard API)
  if (!gatewayToken && !args.submit) {
    console.error(`${c.red}Error: --gateway-token is required${c.reset}`);
    console.error(`Auto-detected from ~/.openclaw/openclaw.json — or set OPENCLAW_GATEWAY_TOKEN env var`);
    console.error(`Example: clawbench --gateway-token <your-openclaw-gateway-token>`);
    process.exit(1);
  }

  // Create sandbox
  const sandboxRoot = sandbox.create(args['sandbox-dir']);
  sandbox.registerCleanupHandlers(keepSandbox);

  if (!ci) {
    console.log('');
    console.log(`${c.bold}${c.cyan}ClawBench${c.reset} — Starting benchmark suite`);
    console.log(`${c.dim}  Gateway: ${gatewayUrl}${c.reset}`);
    console.log(`${c.dim}  Agent:   ${agentTarget}${c.reset}`);
    if (modelOverride) console.log(`${c.dim}  Model:   ${modelOverride}${c.reset}`);
    if (agentName) console.log(`${c.dim}  Name:    ${agentName}${c.reset}`);
    console.log(`${c.dim}  Sandbox: ${sandboxRoot}${c.reset}`);
    console.log(`${c.dim}  Tests:   ${testCases.length}${c.reset}`);
    console.log(`${c.dim}  Timeout: ${timeoutMs / 1000}s per test${c.reset}`);
    console.log('');
  }

  // Run
  let completed = 0;
  const scorecard = await runSuite(testCases, {
    apiUrl: gatewayUrl,
    model: agentTarget,
    modelOverride,
    apiKey: gatewayToken,
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

  // Submit to leaderboard if requested
  if (args.submit) {
    const submitBaseUrl = args['submit-url'] || 'https://clawbench.club';
    const { createHmac } = require('crypto');

    // Build scorecard payload (what gets signed)
    const scorecardPayload = {
      model: scorecard.model || modelOverride || agentTarget,
      agent: agentTarget,
      agentName: agentName || null,
      totalScore: scorecard.totalScore,
      maxScore: scorecard.maxScore,
      categories: scorecard.categories || {},
      gatewayUrl: gatewayUrl,
    };

    try {
      // Step 1: Get a challenge nonce from the server
      const challengeRes = await fetch(`${submitBaseUrl}/api/submit`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      let verified = false;
      let payload = { ...scorecardPayload, openclawVersion: scorecard.openclawVersion || null };

      if (challengeRes.ok) {
        const { nonce } = await challengeRes.json();

        // Step 2: Verify gateway token locally (Option B — server does not call localhost)
        // This works for local gateways that the remote server cannot reach.
        if (gatewayToken) {
          const gwUrl = gatewayUrl.replace(/\/+$/, '');
          let localVerifyOK = false;
          try {
            if (!ci) console.log(`  ${c.dim}Verifying gateway token locally...${c.reset}`);
            const gwRes = await fetch(`${gwUrl}/v1/models`, {
              headers: { Authorization: `Bearer ${gatewayToken}` },
              signal: AbortSignal.timeout(8000),
            });
            localVerifyOK = gwRes.ok;
          } catch (_) {
            localVerifyOK = false;
          }

          if (!localVerifyOK) {
            if (!ci) console.log(`  ${c.red}Gateway token verification failed locally — cannot reach gateway or token is invalid${c.reset}`);
            // Fall through as unverified rather than blocking the whole submit
          } else {
            // Step 3: Sign scorecard + nonce with gateway token (proves possession)
            const sigData = JSON.stringify(scorecardPayload) + nonce;
            const signature = createHmac('sha256', gatewayToken).update(sigData).digest('hex');
            // Step 4: Submit with signature + nonce + gatewayVerified flag
            // Server verifies HMAC; gatewayToken is used once and discarded, never stored.
            payload = { ...payload, gatewayToken, signature, nonce, gatewayVerified: true };
            verified = true;
            if (!ci) console.log(`  ${c.dim}Gateway token verified locally — submitting with attestation${c.reset}`);
          }
        } else {
          if (!ci) console.log(`  ${c.dim}No gateway token — submitting as unverified${c.reset}`);
        }
      } else if (!gatewayToken) {
        if (!ci) console.log(`  ${c.dim}No gateway token — submitting as unverified${c.reset}`);
      } else {
        if (!ci) console.log(`  ${c.dim}Challenge endpoint unavailable — submitting as unverified${c.reset}`);
      }

      // Step 4: Submit
      const res = await fetch(`${submitBaseUrl}/api/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (!ci) {
          console.log('');
          console.log(`  ${c.green}Submitted to leaderboard!${c.reset}`);
          if (data.verified) {
            console.log(`  ${c.green}${c.bold}✓ Verified${c.reset} — token verified, score is authentic`);
          } else {
            console.log(`  ${c.yellow}⚠ Unverified${c.reset} — provide a gateway token to get a verified badge`);
          }
          console.log(`  ${c.dim}View: ${submitBaseUrl}/r/${data.short_id}${c.reset}`);
        }
      } else {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        if (!ci) console.log(`  ${c.red}Submission failed: ${err.error || res.status}${c.reset}`);
      }
    } catch (err) {
      if (!ci) console.log(`  ${c.dim}Could not reach leaderboard — results saved locally${c.reset}`);
    }
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
