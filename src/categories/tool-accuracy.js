const fs = require('fs');
const path = require('path');

const CATEGORY = 'Tool Accuracy';

module.exports = [
  {
    id: 'tool-accuracy-1',
    category: CATEGORY,
    description: 'Write and read back a file with exact contents',
    maxPoints: 5,
    timeout: 60000,
    async setup(ctx) {
      // No setup needed
    },
    async prompt(ctx) {
      return `Write a file called "hello.txt" in the directory "${ctx.sandboxDir}" with exactly this content (no extra whitespace or newlines):

The quick brown fox jumps over the lazy dog.
ClawBench test: 42.

After writing, read the file back and output its exact contents between <file-content> and </file-content> tags.`;
    },
    async evaluate(response, ctx) {
      const expected = 'The quick brown fox jumps over the lazy dog.\nClawBench test: 42.';
      // Check if response contains the expected content
      const match = response.match(/<file-content>([\s\S]*?)<\/file-content>/);
      const content = match ? match[1].trim() : response.trim();
      const passed = content === expected;
      return {
        id: 'tool-accuracy-1',
        category: CATEGORY,
        description: 'Write and read back a file with exact contents',
        score: passed ? 5 : 0,
        maxPoints: 5,
        passed,
        reason: passed ? 'Content matched exactly' : `Content mismatch. Expected "${expected}", got "${content.substring(0, 100)}"`,
        latencyMs: 0,
      };
    },
  },
  {
    id: 'tool-accuracy-2',
    category: CATEGORY,
    description: 'Edit specific lines in a file',
    maxPoints: 5,
    timeout: 60000,
    async setup(ctx) {
      const content = [
        'line 1: alpha',
        'line 2: beta',
        'line 3: gamma',
        'line 4: delta',
        'line 5: epsilon',
      ].join('\n');
      fs.writeFileSync(path.join(ctx.sandboxDir, 'edit-me.txt'), content);
    },
    async prompt(ctx) {
      return `There is a file at "${path.join(ctx.sandboxDir, 'edit-me.txt')}" with 5 lines.
Change ONLY line 3 from "line 3: gamma" to "line 3: MODIFIED" and leave all other lines unchanged.
Then output the full file contents between <file-content> and </file-content> tags.`;
    },
    async evaluate(response, ctx) {
      const expected = [
        'line 1: alpha',
        'line 2: beta',
        'line 3: MODIFIED',
        'line 4: delta',
        'line 5: epsilon',
      ].join('\n');
      const match = response.match(/<file-content>([\s\S]*?)<\/file-content>/);
      const content = match ? match[1].trim() : '';
      const passed = content === expected;
      return {
        id: 'tool-accuracy-2',
        category: CATEGORY,
        description: 'Edit specific lines in a file',
        score: passed ? 5 : 0,
        maxPoints: 5,
        passed,
        reason: passed ? 'Only line 3 was modified' : 'Incorrect edit result',
        latencyMs: 0,
      };
    },
  },
  {
    id: 'tool-accuracy-3',
    category: CATEGORY,
    description: 'Create directory structure and search for files',
    maxPoints: 5,
    timeout: 60000,
    async setup(ctx) {
      // No setup needed
    },
    async prompt(ctx) {
      return `In the directory "${ctx.sandboxDir}", create the following structure:
- project/
  - src/
    - main.js (containing "console.log('hello')")
    - utils.js (containing "module.exports = {}")
  - test/
    - main.test.js (containing "test('works', () => {})")
  - README.md (containing "# Project")

After creating them, list ALL .js files (not .md) in the structure. Output the filenames (relative to project/) between <js-files> and </js-files> tags, one per line, sorted alphabetically.`;
    },
    async evaluate(response, ctx) {
      const match = response.match(/<js-files>([\s\S]*?)<\/js-files>/);
      const files = match ? match[1].trim().split('\n').map(f => f.trim()).filter(Boolean).sort() : [];
      const expected = ['src/main.js', 'src/utils.js', 'test/main.test.js'].sort();
      const passed = JSON.stringify(files) === JSON.stringify(expected);
      return {
        id: 'tool-accuracy-3',
        category: CATEGORY,
        description: 'Create directory structure and search for files',
        score: passed ? 5 : 0,
        maxPoints: 5,
        passed,
        reason: passed ? 'All .js files found correctly' : `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(files)}`,
        latencyMs: 0,
      };
    },
  },
];
