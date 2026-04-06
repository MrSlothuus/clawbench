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

## Benchmark Categories

### 1. Tool Accuracy (20 points)
- Write a file to temp dir, read it back, verify contents match
- Edit specific lines in a file, verify only those lines changed
- Create a directory structure, search for files with glob/grep patterns
- Each sub-task scores pass/fail, measure latency

### 2. Code Generation + Execution (20 points)
- Generate a function that solves a specific problem (e.g., "write a function that finds the longest palindromic substring")
- Execute it with test cases in the sandbox
- Verify output matches expected results
- Test edge cases the model might miss

### 3. Reasoning + Instruction Following (20 points)
- Multi-constraint tasks: "Write a JSON file with exactly 5 entries, each must have fields X/Y/Z, sorted by Y descending, no value may repeat"
- Parse and validate the output programmatically
- Ambiguous instructions where the model must make reasonable assumptions and document them

### 4. Error Recovery (20 points)
- Give a file with deliberate syntax errors, ask agent to fix it
- Give a broken JSON config, ask to repair it
- Ask to run a command that will fail, verify agent handles the error gracefully
- Test if agent retries or asks for help vs silently failing

### 5. Research + Synthesis (10 points)
- Fetch a known URL, extract specific data points
- Cross-reference information from 2 sources
- Produce a structured summary with citations

### 6. Context Management (10 points)
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

## Technical Requirements

- Single package, minimal dependencies (only what's needed)
- Works with OpenClaw's tool interface OR as standalone with any OpenAI-compatible API
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
    categories/
      tool-accuracy.js
      code-generation.js
      reasoning.js
      error-recovery.js
      research.js
      context.js
  examples/
    sample-scorecard.json
```

## Acceptance Criteria

1. `node bin/clawbench.js --help` shows usage
2. `node bin/clawbench.js --dry-run` shows all test cases without executing
3. `node bin/clawbench.js --api-url http://localhost:18789 --model anthropic/claude-sonnet-4-6` runs the full suite
4. Produces a valid JSON scorecard at the end
5. Terminal output is colorful and readable
6. All test evaluation is programmatic (no LLM-as-judge)
7. Temp directory is created at start and cleaned at end
8. Each test has a 60-second timeout
9. Total suite completes in under 10 minutes
10. README explains what ClawBench is, how to run it, how to interpret scores
