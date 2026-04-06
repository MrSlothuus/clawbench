const CATEGORY = 'Code Generation';

module.exports = [
  {
    id: 'code-gen-1',
    category: CATEGORY,
    description: 'Generate a function: longest palindromic substring',
    maxPoints: 5,
    timeout: 60000,
    async setup() {},
    async prompt() {
      return `Write a JavaScript function called longestPalindrome that takes a string and returns the longest palindromic substring. If there are multiple of the same length, return the first one found.

Output ONLY the function code between <code> and </code> tags. No explanation.

Test cases it must pass:
- longestPalindrome("babad") => "bab" or "aba"
- longestPalindrome("cbbd") => "bb"
- longestPalindrome("a") => "a"
- longestPalindrome("") => ""
- longestPalindrome("racecar") => "racecar"`;
    },
    async evaluate(response) {
      const match = response.match(/<code>([\s\S]*?)<\/code>/);
      const code = match ? match[1].trim() : response.trim();

      try {
        const fn = new Function(`${code}\nreturn longestPalindrome;`)();

        const tests = [
          { input: 'babad', valid: ['bab', 'aba'] },
          { input: 'cbbd', valid: ['bb'] },
          { input: 'a', valid: ['a'] },
          { input: '', valid: [''] },
          { input: 'racecar', valid: ['racecar'] },
        ];

        let passed = 0;
        for (const t of tests) {
          const result = fn(t.input);
          if (t.valid.includes(result)) passed++;
        }

        const allPassed = passed === tests.length;
        return {
          id: 'code-gen-1',
          category: CATEGORY,
          description: 'Generate a function: longest palindromic substring',
          score: Math.round((passed / tests.length) * 5),
          maxPoints: 5,
          passed: allPassed,
          reason: allPassed ? 'All test cases passed' : `${passed}/${tests.length} test cases passed`,
          latencyMs: 0,
        };
      } catch (err) {
        return {
          id: 'code-gen-1',
          category: CATEGORY,
          description: 'Generate a function: longest palindromic substring',
          score: 0,
          maxPoints: 5,
          passed: false,
          reason: 'Code failed to execute',
          error: err.message,
          latencyMs: 0,
        };
      }
    },
  },
  {
    id: 'code-gen-2',
    category: CATEGORY,
    description: 'Generate a function: deep object merge',
    maxPoints: 5,
    timeout: 60000,
    async setup() {},
    async prompt() {
      return `Write a JavaScript function called deepMerge that takes two objects and returns a new object with deep-merged properties. Arrays should be concatenated, not replaced. Primitives from the second object overwrite the first.

Output ONLY the function code between <code> and </code> tags. No explanation.

Test cases:
- deepMerge({a: 1}, {b: 2}) => {a: 1, b: 2}
- deepMerge({a: {x: 1}}, {a: {y: 2}}) => {a: {x: 1, y: 2}}
- deepMerge({a: [1]}, {a: [2]}) => {a: [1, 2]}
- deepMerge({a: 1}, {a: 2}) => {a: 2}
- deepMerge({}, {a: 1}) => {a: 1}`;
    },
    async evaluate(response) {
      const match = response.match(/<code>([\s\S]*?)<\/code>/);
      const code = match ? match[1].trim() : response.trim();

      try {
        const fn = new Function(`${code}\nreturn deepMerge;`)();

        const tests = [
          { a: { a: 1 }, b: { b: 2 }, expected: { a: 1, b: 2 } },
          { a: { a: { x: 1 } }, b: { a: { y: 2 } }, expected: { a: { x: 1, y: 2 } } },
          { a: { a: [1] }, b: { a: [2] }, expected: { a: [1, 2] } },
          { a: { a: 1 }, b: { a: 2 }, expected: { a: 2 } },
          { a: {}, b: { a: 1 }, expected: { a: 1 } },
        ];

        let passed = 0;
        for (const t of tests) {
          const result = fn(t.a, t.b);
          if (JSON.stringify(result) === JSON.stringify(t.expected)) passed++;
        }

        const allPassed = passed === tests.length;
        return {
          id: 'code-gen-2',
          category: CATEGORY,
          description: 'Generate a function: deep object merge',
          score: Math.round((passed / tests.length) * 5),
          maxPoints: 5,
          passed: allPassed,
          reason: allPassed ? 'All test cases passed' : `${passed}/${tests.length} test cases passed`,
          latencyMs: 0,
        };
      } catch (err) {
        return {
          id: 'code-gen-2',
          category: CATEGORY,
          description: 'Generate a function: deep object merge',
          score: 0,
          maxPoints: 5,
          passed: false,
          reason: 'Code failed to execute',
          error: err.message,
          latencyMs: 0,
        };
      }
    },
  },
  {
    id: 'code-gen-3',
    category: CATEGORY,
    description: 'Generate a function: flatten nested array with depth',
    maxPoints: 5,
    timeout: 60000,
    async setup() {},
    async prompt() {
      return `Write a JavaScript function called flattenDepth that takes an array and a depth number, and flattens the array up to the specified depth. Do NOT use Array.prototype.flat.

Output ONLY the function code between <code> and </code> tags. No explanation.

Test cases:
- flattenDepth([1, [2, [3, [4]]]], 1) => [1, 2, [3, [4]]]
- flattenDepth([1, [2, [3, [4]]]], 2) => [1, 2, 3, [4]]
- flattenDepth([1, [2, [3, [4]]]], Infinity) => [1, 2, 3, 4]
- flattenDepth([[1], [2], [3]], 1) => [1, 2, 3]
- flattenDepth([], 1) => []`;
    },
    async evaluate(response) {
      const match = response.match(/<code>([\s\S]*?)<\/code>/);
      const code = match ? match[1].trim() : response.trim();

      try {
        const fn = new Function(`${code}\nreturn flattenDepth;`)();

        const tests = [
          { arr: [1, [2, [3, [4]]]], depth: 1, expected: [1, 2, [3, [4]]] },
          { arr: [1, [2, [3, [4]]]], depth: 2, expected: [1, 2, 3, [4]] },
          { arr: [1, [2, [3, [4]]]], depth: Infinity, expected: [1, 2, 3, 4] },
          { arr: [[1], [2], [3]], depth: 1, expected: [1, 2, 3] },
          { arr: [], depth: 1, expected: [] },
        ];

        let passed = 0;
        for (const t of tests) {
          const result = fn(t.arr, t.depth);
          if (JSON.stringify(result) === JSON.stringify(t.expected)) passed++;
        }

        const allPassed = passed === tests.length;
        return {
          id: 'code-gen-3',
          category: CATEGORY,
          description: 'Generate a function: flatten nested array with depth',
          score: Math.round((passed / tests.length) * 5),
          maxPoints: 5,
          passed: allPassed,
          reason: allPassed ? 'All test cases passed' : `${passed}/${tests.length} test cases passed`,
          latencyMs: 0,
        };
      } catch (err) {
        return {
          id: 'code-gen-3',
          category: CATEGORY,
          description: 'Generate a function: flatten nested array with depth',
          score: 0,
          maxPoints: 5,
          passed: false,
          reason: 'Code failed to execute',
          error: err.message,
          latencyMs: 0,
        };
      }
    },
  },
];
