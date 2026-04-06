const fs = require('fs');
const path = require('path');

const CATEGORY = 'Error Recovery';

module.exports = [
  {
    id: 'error-recovery-1',
    category: CATEGORY,
    description: 'Fix JavaScript syntax errors',
    maxPoints: 5,
    timeout: 60000,
    async setup(ctx) {
      const broken = `function calculateTotal(items) {
  let total = 0
  for (let i = 0; i < items.length; i++) {
    total += items[i].price * items[i].quantity
    if (items[i].discount {
      total -= items[i].discount
    }
  }
  return total
}

function formatPrice(amount) {
  return "$" + amount.toFixed(2)
}

module.exports = { calculateTotal, formatPrice }`;
      fs.writeFileSync(path.join(ctx.sandboxDir, 'broken.js'), broken);
    },
    async prompt(ctx) {
      const filePath = path.join(ctx.sandboxDir, 'broken.js');
      const content = fs.readFileSync(filePath, 'utf-8');
      return `This JavaScript file has syntax errors. Fix ALL syntax errors and output the corrected code between <fixed> and </fixed> tags.

\`\`\`javascript
${content}
\`\`\`

The fixed code must:
1. Have no syntax errors (be parseable by Node.js)
2. The calculateTotal function should correctly sum price*quantity minus discount
3. The formatPrice function should format as "$X.XX"`;
    },
    async evaluate(response) {
      const match = response.match(/<fixed>([\s\S]*?)<\/fixed>/);
      const code = match ? match[1].trim() : '';

      let score = 0;
      try {
        // Check it parses
        new Function(code);
        score += 2; // Syntactically valid

        // Check it works
        const fn = new Function(`${code}\nreturn { calculateTotal, formatPrice };`)();

        const items = [
          { price: 10, quantity: 2, discount: 5 },
          { price: 20, quantity: 1 },
        ];
        const total = fn.calculateTotal(items);
        if (total === 35) score += 2; // Correct calculation

        const formatted = fn.formatPrice(35);
        if (formatted === '$35.00') score += 1; // Correct formatting
      } catch {
        // Still has errors
      }

      return {
        id: 'error-recovery-1',
        category: CATEGORY,
        description: 'Fix JavaScript syntax errors',
        score,
        maxPoints: 5,
        passed: score >= 4,
        reason: score >= 4 ? 'Syntax fixed and functions work correctly' : `${score}/5: some issues remain`,
        latencyMs: 0,
      };
    },
  },
  {
    id: 'error-recovery-2',
    category: CATEGORY,
    description: 'Repair broken JSON config',
    maxPoints: 5,
    timeout: 60000,
    async setup(ctx) {
      // JSON with multiple issues: trailing commas, missing quotes, wrong brackets
      const broken = `{
  "name": "my-app",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.0",
    "lodash": "^4.17.21",
  },
  "scripts": {
    "start": "node index.js",
    "test": "jest"
    "build": "webpack"
  },
  "config": {
    "port": 3000,
    "host": "localhost",
    "debug": true,
    "features": ["auth", "logging", "metrics",]
  }
}`;
      fs.writeFileSync(path.join(ctx.sandboxDir, 'broken.json'), broken);
    },
    async prompt(ctx) {
      const content = fs.readFileSync(path.join(ctx.sandboxDir, 'broken.json'), 'utf-8');
      return `This JSON file has syntax errors that prevent it from parsing. Fix ALL JSON syntax errors while preserving the intended data. Output the corrected JSON between <json> and </json> tags.

\`\`\`json
${content}
\`\`\``;
    },
    async evaluate(response) {
      const match = response.match(/<json>([\s\S]*?)<\/json>/);
      const jsonStr = match ? match[1].trim() : '';

      let score = 0;
      try {
        const parsed = JSON.parse(jsonStr);
        score += 2; // Valid JSON

        // Check key fields preserved
        if (parsed.name === 'my-app') score += 0.5;
        if (parsed.version === '1.0.0') score += 0.5;
        if (parsed.dependencies?.express === '^4.18.0') score += 0.5;
        if (parsed.scripts?.start === 'node index.js') score += 0.5;
        if (parsed.scripts?.build === 'webpack') score += 0.5;
        if (parsed.config?.port === 3000) score += 0.5;
      } catch {
        // Still broken
      }

      return {
        id: 'error-recovery-2',
        category: CATEGORY,
        description: 'Repair broken JSON config',
        score: Math.min(Math.round(score), 5),
        maxPoints: 5,
        passed: score >= 4,
        reason: score >= 4 ? 'JSON repaired with all data preserved' : `${Math.round(score)}/5: JSON still has issues or data lost`,
        latencyMs: 0,
      };
    },
  },
  {
    id: 'error-recovery-3',
    category: CATEGORY,
    description: 'Handle a failing command gracefully',
    maxPoints: 5,
    timeout: 60000,
    async setup() {},
    async prompt(ctx) {
      return `I need you to read the file at "${path.join(ctx.sandboxDir, 'nonexistent-file.txt')}" and tell me its contents.

If the file doesn't exist, explain the error clearly and suggest a fix. Your response should:
1. Acknowledge the error (mention "not found", "does not exist", or "ENOENT")
2. Suggest creating the file or checking the path
3. Do NOT pretend the file exists or make up contents

Output your response between <response> and </response> tags.`;
    },
    async evaluate(response) {
      const match = response.match(/<response>([\s\S]*?)<\/response>/);
      const text = (match ? match[1] : response).toLowerCase();

      let score = 0;

      // Acknowledges the error
      if (text.includes('not found') || text.includes('does not exist') || text.includes('enoent') || text.includes('no such file') || text.includes("doesn't exist") || text.includes('cannot find')) {
        score += 2;
      }

      // Suggests a fix
      if (text.includes('create') || text.includes('check') || text.includes('verify') || text.includes('make sure') || text.includes('ensure')) {
        score += 2;
      }

      // Does NOT hallucinate content
      if (!text.includes('the file contains') && !text.includes('the contents are') && !text.includes('here is the content')) {
        score += 1;
      }

      return {
        id: 'error-recovery-3',
        category: CATEGORY,
        description: 'Handle a failing command gracefully',
        score: Math.min(score, 5),
        maxPoints: 5,
        passed: score >= 4,
        reason: score >= 4 ? 'Error acknowledged with helpful suggestion' : `${score}/5: incomplete error handling`,
        latencyMs: 0,
      };
    },
  },
];
