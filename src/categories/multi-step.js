const fs = require('fs');
const path = require('path');

const CATEGORY = 'Multi-Step Planning';

module.exports = [
  {
    id: 'multi-step-1',
    category: CATEGORY,
    description: 'Chain: create config, generate code from config, validate output',
    maxPoints: 5,
    timeout: 60000,
    async setup() {},
    async prompt(ctx) {
      return `Complete this multi-step task. Each step depends on the previous one.

Step 1: Create a JSON config file with this structure:
  {"appName": "TaskRunner", "version": "2.0", "modules": ["auth", "logger", "cache"]}

Step 2: Using that config, generate a JavaScript module that exports an object with:
  - A "name" property set to the appName from the config
  - A "version" property set to the version from the config
  - An "init" method that returns a string listing all modules: "Initialized: auth, logger, cache"

Step 3: Show the output of calling the init() method.

Output each step's result:
- Config JSON between <config> and </config>
- Module code between <module> and </module>
- Init output between <output> and </output>`;
    },
    async evaluate(response) {
      let score = 0;

      // Step 1: Valid config
      const configMatch = response.match(/<config>([\s\S]*?)<\/config>/);
      let config = null;
      if (configMatch) {
        try {
          config = JSON.parse(configMatch[1].trim());
          if (config.appName === 'TaskRunner' && config.version === '2.0' && Array.isArray(config.modules)) {
            score += 2;
          }
        } catch {}
      }

      // Step 2: Valid module code
      const moduleMatch = response.match(/<module>([\s\S]*?)<\/module>/);
      if (moduleMatch) {
        try {
          const code = moduleMatch[1].trim();
          // Try to evaluate
          const mod = new Function(`${code}\nreturn typeof module !== 'undefined' && module.exports ? module.exports : (typeof app !== 'undefined' ? app : (typeof TaskRunner !== 'undefined' ? TaskRunner : null));`)();
          if (mod) {
            if (mod.name === 'TaskRunner' || mod.appName === 'TaskRunner') score += 0.5;
            if (mod.version === '2.0') score += 0.5;
            if (typeof mod.init === 'function') score += 0.5;
          }
        } catch {
          // Module code doesn't eval cleanly, but check structure
          const code = moduleMatch[1].trim().toLowerCase();
          if (code.includes('taskrunner')) score += 0.5;
        }
      }

      // Step 3: Correct init output
      const outputMatch = response.match(/<output>([\s\S]*?)<\/output>/);
      if (outputMatch) {
        const output = outputMatch[1].trim();
        if (output.includes('auth') && output.includes('logger') && output.includes('cache') && output.toLowerCase().includes('initialized')) {
          score += 1.5;
        }
      }

      const finalScore = Math.min(Math.round(score), 5);
      return {
        id: 'multi-step-1',
        category: CATEGORY,
        description: 'Chain: create config, generate code from config, validate output',
        score: finalScore,
        maxPoints: 5,
        passed: finalScore >= 4,
        reason: finalScore >= 4 ? 'All 3 steps completed with correct dependencies' : `${finalScore}/5: some steps incomplete or incorrect`,
        latencyMs: 0,
      };
    },
  },
  {
    id: 'multi-step-2',
    category: CATEGORY,
    description: 'Decompose task: build and verify directory structure',
    maxPoints: 5,
    timeout: 60000,
    async setup() {},
    async prompt(ctx) {
      return `Create a Node.js project structure in "${ctx.sandboxDir}/myproject" with:
1. package.json with name "myproject", version "1.0.0", main "src/index.js"
2. src/index.js that exports a function "greet(name)" returning "Hello, {name}!"
3. test/index.test.js that tests greet with the name "World" (just write the test assertion as a comment)
4. A .gitignore that ignores node_modules and .env

After creating everything, verify your work by listing all created files.

Output the file listing between <files> and </files> tags (one path per line, relative to myproject/).
Output the content of src/index.js between <index> and </index> tags.`;
    },
    async evaluate(response) {
      let score = 0;

      // Check file listing
      const filesMatch = response.match(/<files>([\s\S]*?)<\/files>/);
      if (filesMatch) {
        const files = filesMatch[1].trim().split('\n').map(f => f.trim().replace(/^[\-\*]\s*/, '').replace(/^\.\//, '')).filter(Boolean);
        const required = ['package.json', 'src/index.js', 'test/index.test.js', '.gitignore'];
        const found = required.filter(r => files.some(f => f.includes(r.replace('./', ''))));
        score += found.length * 0.5; // 0.5 per file found (max 2)
      }

      // Check index.js content
      const indexMatch = response.match(/<index>([\s\S]*?)<\/index>/);
      if (indexMatch) {
        const code = indexMatch[1].trim();
        try {
          const mod = new Function('module', 'exports', `${code}\nreturn module.exports;`)({ exports: {} }, {});
          if (typeof mod === 'function') {
            if (mod('World') === 'Hello, World!') score += 2;
            else score += 1;
          } else if (typeof mod.greet === 'function') {
            if (mod.greet('World') === 'Hello, World!') score += 2;
            else score += 1;
          }
        } catch {
          // Check string-based
          if (code.includes('greet') && code.includes('Hello')) score += 1;
        }
      }

      // Bonus: mentioned all 4 required files
      if (score >= 3) score = Math.min(score + 1, 5);

      const finalScore = Math.min(Math.round(score), 5);
      return {
        id: 'multi-step-2',
        category: CATEGORY,
        description: 'Decompose task: build and verify directory structure',
        score: finalScore,
        maxPoints: 5,
        passed: finalScore >= 4,
        reason: finalScore >= 4 ? 'Project structure created and verified' : `${finalScore}/5: incomplete project structure`,
        latencyMs: 0,
      };
    },
  },
  {
    id: 'multi-step-3',
    category: CATEGORY,
    description: 'Ordered operations: sort, filter, transform pipeline',
    maxPoints: 5,
    timeout: 60000,
    async setup() {},
    async prompt() {
      return `Process this data through a 3-step pipeline. Each step depends on the previous output.

Input data:
[
  {"name": "Alice", "age": 30, "score": 85},
  {"name": "Bob", "age": 17, "score": 92},
  {"name": "Charlie", "age": 25, "score": 78},
  {"name": "Diana", "age": 15, "score": 95},
  {"name": "Eve", "age": 22, "score": 88}
]

Step 1 - FILTER: Keep only entries where age >= 18
Step 2 - SORT: Sort the filtered results by score descending
Step 3 - TRANSFORM: Map each entry to the format: "{name}: {score} points"

Output the result of each step:
- Step 1 result as JSON between <step1> and </step1>
- Step 2 result as JSON between <step2> and </step2>
- Step 3 result as JSON array of strings between <step3> and </step3>`;
    },
    async evaluate(response) {
      let score = 0;

      // Step 1: Filter age >= 18
      const step1Match = response.match(/<step1>([\s\S]*?)<\/step1>/);
      if (step1Match) {
        try {
          const result = JSON.parse(step1Match[1].trim());
          const names = result.map(r => r.name).sort();
          if (JSON.stringify(names) === JSON.stringify(['Alice', 'Charlie', 'Eve'])) {
            score += 2;
          } else if (result.length === 3) {
            score += 1;
          }
        } catch {}
      }

      // Step 2: Sort by score descending
      const step2Match = response.match(/<step2>([\s\S]*?)<\/step2>/);
      if (step2Match) {
        try {
          const result = JSON.parse(step2Match[1].trim());
          const names = result.map(r => r.name);
          if (JSON.stringify(names) === JSON.stringify(['Eve', 'Alice', 'Charlie'])) {
            score += 1.5;
          }
        } catch {}
      }

      // Step 3: Transform
      const step3Match = response.match(/<step3>([\s\S]*?)<\/step3>/);
      if (step3Match) {
        try {
          const result = JSON.parse(step3Match[1].trim());
          const expected = ['Eve: 88 points', 'Alice: 85 points', 'Charlie: 78 points'];
          if (JSON.stringify(result) === JSON.stringify(expected)) {
            score += 1.5;
          } else if (result.length === 3 && result.every(s => s.includes('points'))) {
            score += 0.5;
          }
        } catch {}
      }

      const finalScore = Math.min(Math.round(score), 5);
      return {
        id: 'multi-step-3',
        category: CATEGORY,
        description: 'Ordered operations: sort, filter, transform pipeline',
        score: finalScore,
        maxPoints: 5,
        passed: finalScore >= 4,
        reason: finalScore >= 4 ? 'All pipeline steps correct' : `${finalScore}/5: pipeline errors`,
        latencyMs: 0,
      };
    },
  },
];
