# ClawBench

The first open agent orchestration benchmark. Tests the full stack: model + tools + memory + orchestration + error recovery.

## What it does

ClawBench runs 20 benchmark tasks across 7 categories against any OpenAI-compatible API endpoint and produces a 0-100 scorecard. Every evaluation is programmatic, no LLM-as-judge.

### Categories

| Category | Points | Tests | What it measures |
|----------|--------|-------|-----------------|
| Tool Accuracy | 15 | 3 | File I/O, editing, directory operations |
| Code Generation | 15 | 3 | Function generation, execution, edge cases |
| Reasoning | 15 | 3 | Constraint satisfaction, logic, ambiguity handling |
| Error Recovery | 15 | 3 | Syntax fixing, JSON repair, graceful failure |
| Multi-Step Planning | 15 | 3 | Task chaining, dependency tracking, decomposition |
| Research + Synthesis | 10 | 2 | Data extraction, cross-referencing, summarization |
| Context Management | 15 | 3 | Fact recall, state tracking, hallucination resistance |

## Install

```bash
npm install -g clawbench
```

Or run directly:

```bash
npx clawbench --help
```

## Quick start

```bash
# Set your API key
export OPENAI_API_KEY=sk-...

# Run the full suite
npx clawbench --api-url http://localhost:18789 --model anthropic/claude-sonnet-4-6

# Preview all test cases without running
npx clawbench --dry-run

# Run a single category
npx clawbench --only "Tool Accuracy" --model gpt-4o

# CI mode with threshold
npx clawbench --ci --threshold 80 --model anthropic/claude-sonnet-4-6
```

Expected output for `--dry-run`:

```
ClawBench — Dry Run
20 test cases across 7 categories

  Tool Accuracy
    [5pts] Write and read back a file with exact contents
    [5pts] Edit specific lines in a file
    [5pts] Create directory structure and search for files
  Code Generation
    [5pts] Generate a function: longest palindromic substring
    ...
```

## CLI options

| Flag | Description | Default |
|------|-------------|---------|
| `--api-url <url>` | API endpoint | `http://localhost:18789` |
| `--model <name>` | Model identifier (required) | — |
| `--timeout <sec>` | Per-test timeout | `60` |
| `--only <category>` | Run single category | all |
| `--ci` | CI mode: JSON only, exit code | off |
| `--threshold <n>` | Min score for CI pass | `70` |
| `--keep-sandbox` | Preserve temp dir after run | off |
| `--sandbox-dir <path>` | Custom sandbox path | auto |
| `--output <path>` | Write JSON scorecard to file | — |
| `--dry-run` | List tests without running | off |
| `--help` | Show help | — |

API key: set `OPENAI_API_KEY` environment variable (preferred) or `--api-key` flag.

## Interpreting scores

| Score | Rating | Meaning |
|-------|--------|---------|
| 90-100 | Excellent | Agent handles complex orchestration reliably |
| 70-89 | Solid | Agent works well for most tasks |
| 40-69 | Functional | Agent works but has gaps in some areas |
| 0-39 | Needs work | Significant agent capability issues |

## Scorecard format

Output is a JSON object:

```json
{
  "tool": "clawbench",
  "version": "1.0.0",
  "timestamp": "2026-04-06T00:00:00.000Z",
  "model": "anthropic/claude-sonnet-4-6",
  "apiUrl": "http://localhost:18789",
  "totalScore": 82,
  "maxScore": 100,
  "categories": {
    "Tool Accuracy": { "score": 15, "maxPoints": 15, "testsPassed": 3, "testsTotal": 3 }
  },
  "results": [...]
}
```

## Design principles

1. **Read-only on the host** — all work happens in a temp directory, cleaned up after
2. **Self-contained** — single CLI, no deps beyond Node.js 18+
3. **Reproducible** — temperature pinned to 0, deterministic scoring
4. **Time-boxed** — 60s per test, full suite under 10 minutes

## License

MIT
