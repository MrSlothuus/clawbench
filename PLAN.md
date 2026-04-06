<!-- /autoplan restore point: /Users/ulrichslothuus/.gstack/projects/clawbench/main-autoplan-restore-20260406-020133.md -->
# ClawBench — The First Open Agent Orchestration Benchmark

## Vision

A sandboxed, non-destructive benchmark tool that tests how well AI models perform as agents inside orchestration frameworks. Unlike PinchBench which tests models in isolation, ClawBench tests the full stack: model + tools + memory + orchestration + error recovery.

## Design Principles

1. Read-only on the host — ALL work in a temp directory, cleaned up after
2. Self-contained — single CLI command to run, no deps beyond Node.js
3. Scores the full agent stack, not just the model
4. Reproducible — same tasks, same scoring, comparable across runs
5. Time-boxed — each task has a timeout, full suite under 10 minutes
6. Works on any OpenClaw install without breaking anything

## Known Tradeoffs

- **Deterministic scoring only.** No LLM-as-judge. This means some valid but unexpected solutions may score 0. Accepted tradeoff for reproducibility.
- **No live network access in tests.** Research category uses local fixture data, not live URLs. Reproducibility over realism.
- **OpenAI-compatible API interface.** Tests model responses to agent-style prompts, not actual tool dispatch mechanics. Sufficient for v1 scoring.

## Benchmark Categories

### 1. Tool Accuracy (15 points)
- Write a file to temp dir, read it back, verify contents match
- Edit specific lines in a file, verify only those lines changed
- Create a directory structure, search for files with glob/grep patterns
- Each sub-task scores pass/fail, measure latency

### 2. Code Generation + Execution (15 points)
- Generate a function that solves a specific problem (e.g., "write a function that finds the longest palindromic substring")
- Execute it with test cases in the sandbox
- Verify output matches expected results
- Test edge cases the model might miss

### 3. Reasoning + Instruction Following (15 points)
- Multi-constraint tasks: "Write a JSON file with exactly 5 entries, each must have fields X/Y/Z, sorted by Y descending, no value may repeat"
- Parse and validate the output programmatically
- Ambiguous instructions where the model must make reasonable assumptions and document them

### 4. Error Recovery (15 points)
- Give a file with deliberate syntax errors, ask agent to fix it
- Give a broken JSON config, ask to repair it
- Ask to run a command that will fail, verify agent handles the error gracefully
- Test if agent retries or asks for help vs silently failing

### 5. Multi-Step Planning (15 points) [NEW — CEO review expansion]
- Chain 3+ tool calls in sequence: create project structure, write config, generate code, run tests
- Verify the agent maintains state across steps (later steps depend on earlier outputs)
- Test ability to decompose a complex task into subtasks
- Verify correct ordering of dependent operations

### 6. Research + Synthesis (10 points)
- Given local fixture files (not live URLs), extract specific data points
- Cross-reference information from 2 local sources
- Produce a structured summary with citations

### 7. Context Management (15 points)
- Send a long context (conversation history), ask about details from early in the context
- Test if agent correctly tracks state across multiple tool calls
- Verify agent doesn't hallucinate facts not present in the provided context

## Architecture

- Node.js CLI tool: `npx clawbench` or `node clawbench.js`
- Each category is a module with test cases
- Test runner creates temp sandbox dir, runs all tests, scores results
- Output: JSON scorecard + human-readable terminal report
- Scorecard includes: total score (0-100), per-category scores, latency per task, model name/version, timestamp
- Terminal output should be colorful and clear (green/red/yellow)
- `--ci` flag for CI mode: JSON output only, exit code 0 if score >= threshold

## Technical Requirements

- Single package, minimal dependencies (only what's needed)
- Works with any OpenAI-compatible API endpoint
- Each test case has: description, setup function, evaluation function, timeout, max points
- Deterministic scoring — no subjective evaluation, everything is programmatically verified
- README.md with clear install/usage instructions
- MIT license

## File Structure

```
clawbench/
  package.json
  README.md
  LICENSE
  bin/clawbench.js          # CLI entry point
  src/
    runner.js               # Test orchestrator
    scorer.js               # Scoring engine
    reporter.js             # Terminal + JSON output
    sandbox.js              # Temp dir management
    api-client.js           # OpenAI-compatible API client
    categories/
      tool-accuracy.js
      code-generation.js
      reasoning.js
      error-recovery.js
      multi-step.js
      research.js
      context.js
    fixtures/               # Local test data for research category
      article-a.json
      article-b.json
  examples/
    sample-scorecard.json
```

## Acceptance Criteria

1. `node bin/clawbench.js --help` shows usage
2. `node bin/clawbench.js --dry-run` shows all test cases without executing
3. `node bin/clawbench.js --api-url http://localhost:18789 --model anthropic/claude-sonnet-4-6` runs the full suite
4. `node bin/clawbench.js --ci --threshold 70` exits 0 if score >= 70, 1 otherwise
5. Produces a valid JSON scorecard at the end
6. Terminal output is colorful and readable
7. All test evaluation is programmatic (no LLM-as-judge)
8. Temp directory is created at start and cleaned at end
9. Each test has a 60-second timeout
10. Total suite completes in under 10 minutes
11. README explains what ClawBench is, how to run it, how to interpret scores

## NOT in scope (v1)
- Leaderboard / public score submission
- Custom test authoring / community-contributed tasks
- Multi-agent coordination benchmarks
- LLM-as-judge scoring
- Difficulty tiers (easy/medium/hard) — deferred to v2

<!-- AUTONOMOUS DECISION LOG -->
## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|---------------|-----------|-----------|----------|
| 1 | CEO | Add multi-step planning category | Mechanical | P2 boil lakes | Core orchestration capability, in blast radius, 1 file | — |
| 2 | CEO | Add --ci flag | Mechanical | P2 boil lakes | Table stakes for benchmark tool, 5 lines | — |
| 3 | CEO | Use local fixtures instead of live URLs | Mechanical | P1 completeness | Reproducibility principle requires it | Live URL fetching |
| 4 | CEO | Keep deterministic scoring only | Taste | P5 explicit | Reproducibility over expressiveness. Valid concern that unusual solutions score 0. | LLM-as-judge hybrid |
| 5 | CEO | Defer leaderboard to TODOS | Mechanical | P3 pragmatic | Out of v1 scope, no community yet | Build leaderboard now |
| 6 | CEO | Defer difficulty tiers | Taste | P6 action | Ship v1 first, add tiers when we see score distributions | Add tiers now |
| 7 | CEO | Rebalance points (7 categories, 100 total) | Mechanical | P1 completeness | 7th category needs points | Original 6-category split |
