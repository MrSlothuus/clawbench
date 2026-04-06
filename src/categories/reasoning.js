const CATEGORY = 'Reasoning';

module.exports = [
  {
    id: 'reasoning-1',
    category: CATEGORY,
    description: 'Multi-constraint JSON generation',
    maxPoints: 5,
    timeout: 60000,
    async setup() {},
    async prompt() {
      return `Generate a JSON array with exactly 5 objects. Each object must have these fields:
- "name": a unique string (no duplicates)
- "score": a unique integer between 1 and 100 (no duplicates)
- "category": one of "A", "B", or "C" (at least one of each must appear)

The array must be sorted by "score" in descending order.

Output ONLY the JSON between <json> and </json> tags. No explanation.`;
    },
    async evaluate(response) {
      const match = response.match(/<json>([\s\S]*?)<\/json>/);
      const jsonStr = match ? match[1].trim() : response.trim();

      const checks = { count: false, fields: false, uniqueNames: false, uniqueScores: false, sorted: false, categories: false, scoreRange: false };

      try {
        const arr = JSON.parse(jsonStr);

        // Exactly 5 entries
        checks.count = Array.isArray(arr) && arr.length === 5;
        if (!checks.count) throw new Error('Not exactly 5 entries');

        // Required fields
        checks.fields = arr.every(o => typeof o.name === 'string' && typeof o.score === 'number' && typeof o.category === 'string');

        // Unique names
        const names = arr.map(o => o.name);
        checks.uniqueNames = new Set(names).size === 5;

        // Unique scores
        const scores = arr.map(o => o.score);
        checks.uniqueScores = new Set(scores).size === 5;

        // Score range
        checks.scoreRange = scores.every(s => Number.isInteger(s) && s >= 1 && s <= 100);

        // Sorted descending by score
        checks.sorted = scores.every((s, i) => i === 0 || scores[i - 1] > s);

        // All categories present
        const cats = new Set(arr.map(o => o.category));
        checks.categories = ['A', 'B', 'C'].every(c => cats.has(c));

      } catch (err) {
        if (!err.message.includes('Not exactly')) {
          // JSON parse error
        }
      }

      const passedChecks = Object.values(checks).filter(Boolean).length;
      const total = Object.keys(checks).length;
      const allPassed = passedChecks === total;

      const failedChecks = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);

      return {
        id: 'reasoning-1',
        category: CATEGORY,
        description: 'Multi-constraint JSON generation',
        score: Math.round((passedChecks / total) * 5),
        maxPoints: 5,
        passed: allPassed,
        reason: allPassed ? 'All 7 constraints satisfied' : `Failed: ${failedChecks.join(', ')}`,
        latencyMs: 0,
      };
    },
  },
  {
    id: 'reasoning-2',
    category: CATEGORY,
    description: 'Logic puzzle: constraint satisfaction',
    maxPoints: 5,
    timeout: 60000,
    async setup() {},
    async prompt() {
      return `Solve this logic puzzle and output the answer:

There are 4 houses in a row, numbered 1-4 from left to right.
- The red house is immediately to the left of the blue house.
- The green house owner drinks coffee.
- The house 2 owner drinks tea.
- The yellow house is house 1 or house 4.
- The green house is not house 1.

What color is each house? Output your answer as a JSON object mapping house numbers to colors between <answer> and </answer> tags.
Example format: {"1": "color", "2": "color", "3": "color", "4": "color"}`;
    },
    async evaluate(response) {
      const match = response.match(/<answer>([\s\S]*?)<\/answer>/);
      const jsonStr = match ? match[1].trim() : '';

      try {
        const answer = JSON.parse(jsonStr);

        // Validate constraints
        const colors = [answer['1'], answer['2'], answer['3'], answer['4']];
        const checks = [];

        // All 4 colors assigned
        checks.push(colors.length === 4 && colors.every(c => typeof c === 'string'));

        // Red immediately left of blue
        let redBlueOk = false;
        for (let i = 0; i < 3; i++) {
          if (colors[i] && colors[i].toLowerCase() === 'red' && colors[i + 1] && colors[i + 1].toLowerCase() === 'blue') {
            redBlueOk = true;
          }
        }
        checks.push(redBlueOk);

        // Yellow is house 1 or 4
        const yellowOk = (colors[0] && colors[0].toLowerCase() === 'yellow') || (colors[3] && colors[3].toLowerCase() === 'yellow');
        checks.push(yellowOk);

        // Green is not house 1
        checks.push(!colors[0] || colors[0].toLowerCase() !== 'green');

        // House 2 drinks tea, green drinks coffee => house 2 is not green
        checks.push(!colors[1] || colors[1].toLowerCase() !== 'green');

        // All 4 colors are different
        const uniqueColors = new Set(colors.map(c => c && c.toLowerCase()));
        checks.push(uniqueColors.size === 4);

        // Has all required colors
        const required = ['red', 'blue', 'green', 'yellow'];
        checks.push(required.every(c => uniqueColors.has(c)));

        const passedChecks = checks.filter(Boolean).length;
        const allPassed = passedChecks === checks.length;

        return {
          id: 'reasoning-2',
          category: CATEGORY,
          description: 'Logic puzzle: constraint satisfaction',
          score: allPassed ? 5 : Math.round((passedChecks / checks.length) * 3),
          maxPoints: 5,
          passed: allPassed,
          reason: allPassed ? 'All constraints satisfied' : `${passedChecks}/${checks.length} constraints satisfied`,
          latencyMs: 0,
        };
      } catch {
        return {
          id: 'reasoning-2',
          category: CATEGORY,
          description: 'Logic puzzle: constraint satisfaction',
          score: 0,
          maxPoints: 5,
          passed: false,
          reason: 'Could not parse answer as JSON',
          latencyMs: 0,
        };
      }
    },
  },
  {
    id: 'reasoning-3',
    category: CATEGORY,
    description: 'Ambiguous instruction with documented assumptions',
    maxPoints: 5,
    timeout: 60000,
    async setup() {},
    async prompt() {
      return `Create a configuration for a web server. The config should be in JSON format. Requirements:
- It should have a port
- It should support HTTPS
- It should have rate limiting
- It should work for a "production" environment

Some of these requirements are ambiguous. For EACH ambiguous decision you make, document your assumption.

Output the config between <config> and </config> tags.
Output your assumptions between <assumptions> and </assumptions> tags, one per line.`;
    },
    async evaluate(response) {
      let score = 0;

      // Check config exists and is valid JSON
      const configMatch = response.match(/<config>([\s\S]*?)<\/config>/);
      let config = null;
      if (configMatch) {
        try {
          config = JSON.parse(configMatch[1].trim());
          score += 1; // Valid JSON config
        } catch {}
      }

      if (config) {
        // Has port
        if (config.port !== undefined) score += 0.5;
        // Has HTTPS-related config
        const configStr = JSON.stringify(config).toLowerCase();
        if (configStr.includes('https') || configStr.includes('ssl') || configStr.includes('tls') || configStr.includes('cert')) score += 0.5;
        // Has rate limiting
        if (configStr.includes('rate') || configStr.includes('limit')) score += 0.5;
        // Has production indicators
        if (configStr.includes('production') || configStr.includes('prod')) score += 0.5;
      }

      // Check assumptions documented
      const assumptionsMatch = response.match(/<assumptions>([\s\S]*?)<\/assumptions>/);
      if (assumptionsMatch) {
        const assumptions = assumptionsMatch[1].trim().split('\n').filter(l => l.trim().length > 0);
        if (assumptions.length >= 2) score += 2; // At least 2 assumptions documented
        else if (assumptions.length >= 1) score += 1;
      }

      const passed = score >= 4;
      return {
        id: 'reasoning-3',
        category: CATEGORY,
        description: 'Ambiguous instruction with documented assumptions',
        score: Math.min(Math.round(score), 5),
        maxPoints: 5,
        passed,
        reason: passed ? 'Valid config with documented assumptions' : `Score ${score}/5: missing config elements or assumptions`,
        latencyMs: 0,
      };
    },
  },
];
