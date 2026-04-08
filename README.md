# ClawBench

[![GitHub stars](https://img.shields.io/github/stars/MrSlothuus/clawbench?style=flat&logo=github&label=Stars)](https://github.com/MrSlothuus/clawbench)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

The first open agent orchestration benchmark. Tests the full stack — model + OpenClaw gateway + tools + orchestration + error recovery — not just raw API calls.

**Leaderboard:** [clawbench.club](https://clawbench.club)

---

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/MrSlothuus/clawbench.git
cd clawbench

# 2. Install globally (creates the `clawbench` command)
npm link

# 3. Set your OpenClaw gateway token
export OPENCLAW_GATEWAY_TOKEN="your-token-here"

# 4. Preview all test cases (no execution)
clawbench --dry-run

# 5. Run the benchmark
clawbench

# 6. Run and submit to the leaderboard
clawbench --submit
```

That's it. No other dependencies — just Node.js 18+ and a running OpenClaw gateway.

## Prerequisites

1. **Node.js 18+** installed
2. **OpenClaw installed** with the gateway running (`openclaw gateway start`)
3. **Chat completions endpoint enabled** in your gateway config:

```json
{
  "gateway": {
    "http": {
      "endpoints": {
        "chatCompletions": { "enabled": true }
      }
    }
  }
}
```

4. **Gateway token** — find it in `~/.openclaw/openclaw.json` under `gateway.auth.token`

## Install

> **Note:** The `clawbench` name on npm is claimed by a placeholder package that is not this project. Install from GitHub instead.

```bash
git clone https://github.com/MrSlothuus/clawbench.git
cd clawbench
npm link
```

This creates a global `clawbench` command. To verify:

```bash
clawbench --help
```

To uninstall later:

```bash
npm unlink -g clawbench
```

## Usage

```bash
# Set your token (do this once per shell session)
export OPENCLAW_GATEWAY_TOKEN="your-token-here"

# Preview all test cases without running them
clawbench --dry-run

# Run with your default agent model
clawbench

# Run with a specific model override
clawbench --model minimax-portal/MiniMax-M2.7

# Run with a specific agent and model
clawbench --agent openclaw/default --model anthropic/claude-sonnet-4-6

# Run and submit results to the public leaderboard
clawbench --submit

# Save results to a JSON file
clawbench --output results.json

# CI mode: JSON output + exit code based on score threshold
clawbench --ci --threshold 70
```

## How Routing Works

```
clawbench → OpenClaw gateway (/v1/chat/completions)
          → x-openclaw-model: <your model>  (if specified)
          → OpenClaw agent (openclaw/default)
          → Backend AI model (MiniMax, Anthropic, etc.)
          → OpenClaw strips thinking blocks, handles retries
          → response returned to benchmark
```

This is the key difference vs other benchmarks: ClawBench tests what users actually experience inside OpenClaw, not a raw API response.

## CLI Options

| Flag | Description | Default |
|------|-------------|---------|
| `--gateway-url` | OpenClaw gateway URL | `http://localhost:18789` |
| `--gateway-token` | Gateway bearer token | `$OPENCLAW_GATEWAY_TOKEN` |
| `--agent` | Agent target | `openclaw/default` |
| `--model` | Model override (x-openclaw-model header) | agent default |
| `--timeout` | Per-test timeout (seconds) | `90` |
| `--only` | Run single category only | all |
| `--ci` | CI mode: JSON output + exit code | off |
| `--threshold` | Min score for CI pass | `70` |
| `--keep-sandbox` | Keep temp dir after run | off |
| `--output` | Write JSON scorecard to file | — |
| `--submit` | Submit results to clawbench.club | off |
| `--dry-run` | List tests without running | off |
| `--help` | Show help | — |

Environment variables: `OPENCLAW_GATEWAY_TOKEN` (preferred), `CLAWBENCH_GATEWAY_URL`.

## Score Guide

| Score | Rating | Meaning |
|-------|--------|---------|
| 90–100 | Excellent | Agent handles complex orchestration reliably |
| 70–89 | Solid | Agent works well for most tasks |
| 40–69 | Functional | Agent works but has gaps in some areas |
| 0–39 | Needs work | Significant agent capability issues |

## Test Categories

- **Tool Accuracy** — Correct tool calls, argument handling, result interpretation
- **Code Generation** — Writing, modifying, and debugging code in a sandbox
- **Reasoning** — Logic puzzles, multi-step deduction, ambiguity handling
- **Error Recovery** — Recovering from failures, retries, adaptive approaches
- **Multi-Step Planning** — Sequencing tasks, building pipelines, chaining operations
- **Research + Synthesis** — Data extraction, cross-referencing, structured summaries
- **Context Management** — State tracking, fact recall, hallucination resistance

**20 tests, 100 points total. Full suite runs in ~15–20 minutes.**

## Example Output

```
ClawBench — Starting benchmark suite
  Gateway:  http://localhost:18789
  Agent:    openclaw/default
  Model:    anthropic/claude-sonnet-4-6
  Tests:    20
  Timeout:  90s per test

  [1/20] ✓ Write and read back a file with exact contents
  [2/20] ✗ Edit specific lines in a file (timed out)
  ...

  Overall Score: 91/100  EXCELLENT

  Category Breakdown:
  Tool Accuracy            18/20  ████████████████░░░░
  Code Generation          17/20  ███████████████░░░░░
  Reasoning                14/15  ████████████████████
  ...
```

## Troubleshooting

### `clawbench: command not found` after npm link

Make sure your npm global bin directory is in your PATH:

```bash
# Check where npm puts global binaries
npm config get prefix

# The bin directory is <prefix>/bin — make sure it's in your PATH
# For Homebrew Node.js on macOS, it's typically /opt/homebrew/bin
```

### `Error: --gateway-token is required`

Set the token via environment variable or CLI flag:

```bash
# Option 1: Environment variable (recommended)
export OPENCLAW_GATEWAY_TOKEN="$(jq -r '.gateway.auth.token' ~/.openclaw/openclaw.json)"

# Option 2: CLI flag
clawbench --gateway-token "your-token-here"
```

### `Gateway error 401: Unauthorized`

Your token is wrong. Find the correct one:

```bash
jq '.gateway.auth.token' ~/.openclaw/openclaw.json
```

### `Gateway error: ECONNREFUSED`

The OpenClaw gateway isn't running:

```bash
openclaw gateway start
openclaw gateway status
```

### `npm install -g clawbench` installed the wrong package

The `clawbench` name on npm belongs to a placeholder package (not this project). Uninstall it and install from GitHub:

```bash
npm uninstall -g clawbench
git clone https://github.com/MrSlothuus/clawbench.git
cd clawbench
npm link
```

### Tests timing out

Increase the per-test timeout:

```bash
clawbench --timeout 120
```

## Design Principles

1. **Tests the full stack** — gateway, thinking-block stripping, retry logic, orchestration
2. **Read-only on host** — all work in temp directories, cleaned up after
3. **Reproducible** — temperature pinned to 0, deterministic programmatic scoring
4. **Time-boxed** — 90s per test, full suite ~15–20 minutes
5. **Self-contained** — Node.js 18+ only, no other dependencies

## License

MIT
