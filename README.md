# ClawBench

The first open agent orchestration benchmark. Tests the full stack — model + OpenClaw gateway + tools + orchestration + error recovery — not just raw API calls.

## Install

```bash
npm install -g clawbench
```

Or run directly without installing:

```bash
npx clawbench --help
```

## Prerequisites

1. **OpenClaw installed** with the gateway running
2. **OpenAI-compatible endpoint enabled** in your gateway config:

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

3. **Gateway token** — find it in your `~/.openclaw/openclaw.json` under `gateway.auth.token`

## First run

```bash
# 1. Set your gateway token (replace with your actual token)
export OPENCLAW_GATEWAY_TOKEN="your-token-here"

# 2. Preview all test cases (no execution)
npx clawbench --dry-run

# 3. Run with your default agent model
npx clawbench --gateway-token "$OPENCLAW_GATEWAY_TOKEN"

# 4. Run with a specific model override
npx clawbench \
  --gateway-token "$OPENCLAW_GATEWAY_TOKEN" \
  --model minimax-portal/MiniMax-M2.7

# 5. Run with a specific agent
npx clawbench \
  --gateway-token "$OPENCLAW_GATEWAY_TOKEN" \
  --agent openclaw/default \
  --model anthropic/claude-sonnet-4-6
```

## How routing works

```
clawbench → OpenClaw gateway (/v1/chat/completions)
          → x-openclaw-model: <your model>  (if specified)
          → OpenClaw agent (openclaw/default)
          → Backend AI model (MiniMax, Anthropic, etc.)
          → OpenClaw strips thinking blocks, handles retries
          → response returned to benchmark
```

This is the key difference vs other benchmarks: ClawBench tests what users actually experience inside OpenClaw, not a raw API response.

## CLI options

| Flag | Description | Default |
|------|-------------|---------|
| `--gateway-url` | OpenClaw gateway URL | `http://localhost:18789` |
| `--gateway-token` | Gateway bearer token (required) | — |
| `--agent` | Agent target | `openclaw/default` |
| `--model` | Model override (x-openclaw-model header) | agent default |
| `--timeout` | Per-test timeout (seconds) | `90` |
| `--only` | Run single category only | all |
| `--ci` | CI mode: JSON output + exit code | off |
| `--threshold` | Min score for CI pass | `70` |
| `--keep-sandbox` | Keep temp dir after run | off |
| `--output` | Write JSON scorecard to file | — |
| `--dry-run` | List tests without running | off |
| `--help` | Show help | — |

Environment variables: `OPENCLAW_GATEWAY_TOKEN` (preferred), `CLAWBENCH_GATEWAY_URL`.

## Score guide

| Score | Rating | Meaning |
|-------|--------|---------|
| 90-100 | Excellent | Agent handles complex orchestration reliably |
| 70-89 | Solid | Agent works well for most tasks |
| 40-69 | Functional | Agent works but has gaps in some areas |
| 0-39 | Needs work | Significant agent capability issues |

## Example output

```
ClawBench — Starting benchmark suite
  Gateway:  http://localhost:18789
  Agent:    openclaw/default
  Model:    minimax-portal/MiniMax-M2.7
  Tests:    20
  Timeout:  90s per test

  [1/20] ✓ Write and read back a file with exact contents
  [2/20] ✗ Edit specific lines in a file (timed out)
  ...

  Overall Score: 80/100  SOLID

  Category Breakdown:
  Tool Accuracy            10/15  ████████░░░░░░░░░░░
  Code Generation          9/15   ███████░░░░░░░░░░░░
  Reasoning                15/15  ████████████████████
  ...
```

## Design principles

1. **Tests the full stack** — gateway, thinking-block stripping, retry logic, orchestration
2. **Read-only on host** — all work in temp directories, cleaned up after
3. **Reproducible** — temperature pinned to 0, deterministic programmatic scoring
4. **Time-boxed** — 90s per test, full suite ~15-20 minutes
5. **Self-contained** — Node.js 18+ only, no other dependencies

## License

MIT
