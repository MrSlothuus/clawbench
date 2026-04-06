const fs = require('fs');
const path = require('path');

const CATEGORY = 'Research + Synthesis';

module.exports = [
  {
    id: 'research-1',
    category: CATEGORY,
    description: 'Extract specific data points from a document',
    maxPoints: 5,
    timeout: 60000,
    async setup(ctx) {
      // Create fixture files in the test's sandbox dir
      const articleA = {
        title: 'Q3 2025 Cloud Infrastructure Report',
        source: 'TechAnalytics Inc.',
        date: '2025-10-15',
        findings: [
          { metric: 'Global cloud spending', value: '$178.4 billion', change: '+22% YoY' },
          { metric: 'Top provider market share', value: 'AWS 31%, Azure 25%, GCP 11%', change: 'Azure +3pp' },
          { metric: 'Serverless adoption', value: '47% of enterprises', change: '+12pp YoY' },
          { metric: 'Average monthly downtime', value: '23 minutes', change: '-8 minutes YoY' },
          { metric: 'Container orchestration', value: 'Kubernetes 82% market share', change: '+5pp' },
        ],
      };
      fs.writeFileSync(path.join(ctx.sandboxDir, 'article-a.json'), JSON.stringify(articleA, null, 2));

      const articleB = {
        title: 'Enterprise Cloud Migration Survey 2025',
        source: 'CloudWatch Research',
        date: '2025-11-01',
        findings: [
          { metric: 'Companies with multi-cloud strategy', value: '73%', change: '+8pp YoY' },
          { metric: 'Average migration timeline', value: '14 months', change: '-3 months YoY' },
          { metric: 'Cost savings post-migration', value: '31% average', change: '+4pp' },
          { metric: 'Top migration blocker', value: 'Security concerns (64%)', change: 'unchanged' },
          { metric: 'Serverless adoption', value: '52% of surveyed enterprises', change: '+15pp YoY' },
        ],
      };
      fs.writeFileSync(path.join(ctx.sandboxDir, 'article-b.json'), JSON.stringify(articleB, null, 2));
    },
    async prompt(ctx) {
      const articleA = fs.readFileSync(path.join(ctx.sandboxDir, 'article-a.json'), 'utf-8');
      const articleB = fs.readFileSync(path.join(ctx.sandboxDir, 'article-b.json'), 'utf-8');
      return `Analyze these two research reports and answer the questions below.

Source A:
${articleA}

Source B:
${articleB}

Questions:
1. What is the global cloud spending figure from Source A?
2. What is the serverless adoption rate according to EACH source? Note any discrepancy.
3. What is the top migration blocker according to Source B?

Output your answers between <answers> and </answers> tags as a JSON object with keys "q1", "q2", "q3".`;
    },
    async evaluate(response) {
      const match = response.match(/<answers>([\s\S]*?)<\/answers>/);
      let score = 0;

      if (match) {
        try {
          const answers = JSON.parse(match[1].trim());

          // Q1: $178.4 billion
          if (answers.q1 && answers.q1.includes('178.4')) score += 1.5;

          // Q2: Should mention both 47% and 52%, note discrepancy
          if (answers.q2) {
            const q2 = answers.q2.toLowerCase();
            if (q2.includes('47')) score += 0.5;
            if (q2.includes('52')) score += 0.5;
            if (q2.includes('discrepan') || q2.includes('differ') || q2.includes('gap') || q2.includes('vs') || q2.includes('compared')) score += 0.5;
          }

          // Q3: Security concerns (64%)
          if (answers.q3 && (answers.q3.toLowerCase().includes('security') || answers.q3.includes('64'))) score += 2;

        } catch {}
      }

      const finalScore = Math.min(Math.round(score), 5);
      return {
        id: 'research-1',
        category: CATEGORY,
        description: 'Extract specific data points from a document',
        score: finalScore,
        maxPoints: 5,
        passed: finalScore >= 4,
        reason: finalScore >= 4 ? 'All data points extracted correctly with citations' : `${finalScore}/5: some data points missing or incorrect`,
        latencyMs: 0,
      };
    },
  },
  {
    id: 'research-2',
    category: CATEGORY,
    description: 'Cross-reference and produce structured summary',
    maxPoints: 5,
    timeout: 60000,
    async setup(ctx) {
      // Reuse the same fixtures (they should already exist from research-1 setup)
      const articleA = {
        title: 'Q3 2025 Cloud Infrastructure Report',
        source: 'TechAnalytics Inc.',
        date: '2025-10-15',
        findings: [
          { metric: 'Global cloud spending', value: '$178.4 billion', change: '+22% YoY' },
          { metric: 'Top provider market share', value: 'AWS 31%, Azure 25%, GCP 11%', change: 'Azure +3pp' },
          { metric: 'Serverless adoption', value: '47% of enterprises', change: '+12pp YoY' },
          { metric: 'Average monthly downtime', value: '23 minutes', change: '-8 minutes YoY' },
          { metric: 'Container orchestration', value: 'Kubernetes 82% market share', change: '+5pp' },
        ],
      };
      fs.writeFileSync(path.join(ctx.sandboxDir, 'article-a.json'), JSON.stringify(articleA, null, 2));

      const articleB = {
        title: 'Enterprise Cloud Migration Survey 2025',
        source: 'CloudWatch Research',
        date: '2025-11-01',
        findings: [
          { metric: 'Companies with multi-cloud strategy', value: '73%', change: '+8pp YoY' },
          { metric: 'Average migration timeline', value: '14 months', change: '-3 months YoY' },
          { metric: 'Cost savings post-migration', value: '31% average', change: '+4pp' },
          { metric: 'Top migration blocker', value: 'Security concerns (64%)', change: 'unchanged' },
          { metric: 'Serverless adoption', value: '52% of surveyed enterprises', change: '+15pp YoY' },
        ],
      };
      fs.writeFileSync(path.join(ctx.sandboxDir, 'article-b.json'), JSON.stringify(articleB, null, 2));
    },
    async prompt(ctx) {
      const articleA = fs.readFileSync(path.join(ctx.sandboxDir, 'article-a.json'), 'utf-8');
      const articleB = fs.readFileSync(path.join(ctx.sandboxDir, 'article-b.json'), 'utf-8');
      return `Write a structured summary combining insights from both sources. The summary must:

1. Have a title
2. Have 3-5 key findings, each citing which source (A, B, or both)
3. Note any conflicting data between sources
4. End with a one-sentence conclusion

Source A: ${articleA}
Source B: ${articleB}

Output the summary between <summary> and </summary> tags.`;
    },
    async evaluate(response) {
      const match = response.match(/<summary>([\s\S]*?)<\/summary>/);
      const summary = match ? match[1].trim() : '';

      let score = 0;

      // Has a title (first line is likely a title or contains key words)
      if (summary.length > 0) score += 0.5;

      // Citations present (references to Source A / Source B / both)
      const hasSourceA = /source\s*a/i.test(summary) || /techanalytics/i.test(summary);
      const hasSourceB = /source\s*b/i.test(summary) || /cloudwatch/i.test(summary);
      if (hasSourceA) score += 0.75;
      if (hasSourceB) score += 0.75;

      // Notes conflicting data (serverless adoption rates differ)
      if (/conflict|discrepan|differ|disagree|inconsisten/i.test(summary)) score += 1;

      // Has multiple findings (count bullet points or numbered items)
      const bullets = summary.split('\n').filter(l => /^[\s]*[-*\d+.]/.test(l)).length;
      if (bullets >= 3) score += 1;
      else if (bullets >= 1) score += 0.5;

      // Has a conclusion
      if (/conclusion|overall|in summary|takeaway|bottom line/i.test(summary)) score += 1;

      const finalScore = Math.min(Math.round(score), 5);
      return {
        id: 'research-2',
        category: CATEGORY,
        description: 'Cross-reference and produce structured summary',
        score: finalScore,
        maxPoints: 5,
        passed: finalScore >= 4,
        reason: finalScore >= 4 ? 'Well-structured summary with citations and analysis' : `${finalScore}/5: missing structural elements`,
        latencyMs: 0,
      };
    },
  },
];
