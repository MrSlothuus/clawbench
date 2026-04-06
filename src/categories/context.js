const CATEGORY = 'Context Management';

// Generate a long conversation history for context testing
function generateConversationHistory() {
  return [
    { role: 'user', content: 'My name is Dr. Sarah Chen and I work at QuantumLeap Labs in Cambridge, Massachusetts.' },
    { role: 'assistant', content: 'Nice to meet you, Dr. Chen! How can I help you today?' },
    { role: 'user', content: 'We are working on Project Helios, a quantum error correction system. Our deadline is March 15, 2026.' },
    { role: 'assistant', content: 'Interesting project! What specific aspects are you working on?' },
    { role: 'user', content: 'The main challenge is our surface code decoder. It currently runs at 340 microseconds per cycle, but we need it under 200 microseconds.' },
    { role: 'assistant', content: 'That is a significant optimization target. What approaches have you tried?' },
    { role: 'user', content: 'We tried three approaches: 1) FPGA acceleration (got to 280us), 2) neural decoder (got to 250us but accuracy dropped), 3) hybrid approach (current best at 215us).' },
    { role: 'assistant', content: 'The hybrid approach seems most promising. What is the accuracy situation?' },
    { role: 'user', content: 'The hybrid approach maintains 99.7% accuracy. Our team has 4 people: me (lead), James Park (FPGA), Lisa Wang (ML), and Tom Rivera (systems).' },
    { role: 'assistant', content: 'Strong team. What is the remaining gap to close?' },
    { role: 'user', content: 'We need to go from 215us to under 200us. Tom thinks we can save 10us by optimizing memory access patterns. Lisa wants to try a smaller neural network.' },
    { role: 'assistant', content: 'Both sound reasonable. Any constraints?' },
    { role: 'user', content: 'Budget constraint: we have $50,000 left for compute. The FPGA boards cost $12,000 each and we already have 3. Our grant is from DARPA under program manager Colonel Hayes.' },
    { role: 'assistant', content: 'Understood. What is the priority right now?' },
    { role: 'user', content: 'Priority 1 is hitting the 200us target. Priority 2 is documenting the approach for the March review with Colonel Hayes. Priority 3 is preparing the open-source release.' },
    { role: 'assistant', content: 'Clear priorities. Let me know how I can help.' },
    // Filler messages to add length
    { role: 'user', content: 'Can you help me draft the architecture document? We need to cover the three decoder approaches.' },
    { role: 'assistant', content: 'Of course. Should I start with the FPGA approach since it was attempted first?' },
    { role: 'user', content: 'Yes. Also note that we use Xilinx Versal VCK190 boards. The neural decoder uses a 3-layer transformer with 8 attention heads.' },
    { role: 'assistant', content: 'Got it. I will include those specifications. Anything else to note about the neural decoder?' },
    { role: 'user', content: 'The neural decoder was trained on 2 million syndrome samples. Training took 6 hours on 4 A100 GPUs. The accuracy drop was from 99.7% to 99.3%.' },
  ];
}

module.exports = [
  {
    id: 'context-1',
    category: CATEGORY,
    description: 'Recall specific facts from early in conversation',
    maxPoints: 5,
    timeout: 60000,
    async setup() {},
    async prompt() {
      const history = generateConversationHistory();
      const historyText = history.map(m => `${m.role}: ${m.content}`).join('\n');

      return `Here is a conversation history. Read it carefully, then answer the questions below.

CONVERSATION:
${historyText}

QUESTIONS (answer each precisely):
1. What is the researcher's full name and title?
2. What is the project name and deadline?
3. What are the three approaches tried and their results (latency in microseconds)?
4. Who is the DARPA program manager?
5. What is the remaining budget?

Output answers as JSON between <answers> and </answers> tags with keys q1-q5.`;
    },
    async evaluate(response) {
      const match = response.match(/<answers>([\s\S]*?)<\/answers>/);
      let score = 0;

      if (match) {
        try {
          const answers = JSON.parse(match[1].trim());

          // Q1: Dr. Sarah Chen
          if (answers.q1 && /sarah\s*chen/i.test(answers.q1) && /dr/i.test(answers.q1)) score += 1;

          // Q2: Project Helios, March 15, 2026
          if (answers.q2 && /helios/i.test(answers.q2) && /march.*15.*2026/i.test(answers.q2)) score += 1;

          // Q3: Three approaches with numbers
          if (answers.q3) {
            const q3 = typeof answers.q3 === 'string' ? answers.q3 : JSON.stringify(answers.q3);
            if (/280/i.test(q3)) score += 0.3;
            if (/250/i.test(q3)) score += 0.3;
            if (/215/i.test(q3)) score += 0.4;
          }

          // Q4: Colonel Hayes
          if (answers.q4 && /hayes/i.test(answers.q4)) score += 1;

          // Q5: $50,000
          if (answers.q5 && /50[,.]?000/i.test(answers.q5)) score += 1;

        } catch {}
      }

      const finalScore = Math.min(Math.round(score), 5);
      return {
        id: 'context-1',
        category: CATEGORY,
        description: 'Recall specific facts from early in conversation',
        score: finalScore,
        maxPoints: 5,
        passed: finalScore >= 4,
        reason: finalScore >= 4 ? 'All facts recalled correctly' : `${finalScore}/5: some facts incorrect or missing`,
        latencyMs: 0,
      };
    },
  },
  {
    id: 'context-2',
    category: CATEGORY,
    description: 'Track state changes across conversation',
    maxPoints: 5,
    timeout: 60000,
    async setup() {},
    async prompt() {
      return `Track the state of a bank account through these transactions. Process each one in order.

Starting balance: $1,000.00

Transaction 1: Deposit $500.00 (paycheck)
Transaction 2: Withdraw $200.00 (rent partial)
Transaction 3: Withdraw $350.00 (rent remainder)
Transaction 4: Deposit $75.50 (refund)
Transaction 5: Withdraw $25.00 (subscription)
Transaction 6: Interest credit: 0.5% of current balance

For each transaction, show the running balance. Then answer:
1. What is the final balance (after all transactions including interest)?
2. What was the lowest balance during the transactions?
3. How many withdrawals were there?

Output as JSON between <result> and </result> with keys "finalBalance", "lowestBalance", "withdrawalCount".
Round all amounts to 2 decimal places.`;
    },
    async evaluate(response) {
      const match = response.match(/<result>([\s\S]*?)<\/result>/);
      let score = 0;

      if (match) {
        try {
          const result = JSON.parse(match[1].trim());

          // Calculate correct answers
          // Start: 1000
          // +500 = 1500
          // -200 = 1300
          // -350 = 950
          // +75.50 = 1025.50
          // -25 = 1000.50
          // +0.5% interest = 1000.50 * 1.005 = 1005.5025 => 1005.50
          const expectedFinal = 1005.50;
          const expectedLowest = 950;
          const expectedWithdrawals = 3;

          const final = parseFloat(result.finalBalance);
          const lowest = parseFloat(result.lowestBalance);
          const withdrawals = parseInt(result.withdrawalCount);

          // Final balance (allow small rounding differences)
          if (Math.abs(final - expectedFinal) < 0.02) score += 2;
          else if (Math.abs(final - expectedFinal) < 1) score += 1;

          // Lowest balance
          if (Math.abs(lowest - expectedLowest) < 0.02) score += 1.5;

          // Withdrawal count
          if (withdrawals === expectedWithdrawals) score += 1.5;

        } catch {}
      }

      const finalScore = Math.min(Math.round(score), 5);
      return {
        id: 'context-2',
        category: CATEGORY,
        description: 'Track state changes across conversation',
        score: finalScore,
        maxPoints: 5,
        passed: finalScore >= 4,
        reason: finalScore >= 4 ? 'All state tracked correctly' : `${finalScore}/5: state tracking errors`,
        latencyMs: 0,
      };
    },
  },
  {
    id: 'context-3',
    category: CATEGORY,
    description: 'Resist hallucination: only use provided facts',
    maxPoints: 5,
    timeout: 60000,
    async setup() {},
    async prompt() {
      return `Here are facts about a fictional company. Answer the questions using ONLY these facts. If the information is not provided, say "NOT PROVIDED" — do NOT guess or make up an answer.

FACTS:
- Company name: Nexora Systems
- Founded: 2019
- Headquarters: Austin, Texas
- CEO: Maria Santos
- Product: AI-powered supply chain optimization platform
- Employees: 156
- Revenue 2024: $23.4 million
- Top client: GlobalMart (retail)

QUESTIONS:
1. Who is the CEO of Nexora Systems?
2. What is the company's annual profit?
3. How many employees does Nexora have?
4. Who is the CTO?
5. What year was the company founded?
6. What is the company's stock ticker symbol?

Output answers as JSON between <answers> and </answers> with keys q1-q6.`;
    },
    async evaluate(response) {
      const match = response.match(/<answers>([\s\S]*?)<\/answers>/);
      let score = 0;

      if (match) {
        try {
          const answers = JSON.parse(match[1].trim());

          // Q1: Maria Santos (provided)
          if (answers.q1 && /maria\s*santos/i.test(answers.q1)) score += 0.75;

          // Q2: NOT PROVIDED (profit not mentioned, only revenue)
          if (answers.q2 && /not\s*provided/i.test(answers.q2)) score += 1;
          else score -= 0; // Hallucination penalty already handled by not giving points

          // Q3: 156 (provided)
          if (answers.q3 && /156/.test(String(answers.q3))) score += 0.75;

          // Q4: NOT PROVIDED
          if (answers.q4 && /not\s*provided/i.test(answers.q4)) score += 1;

          // Q5: 2019 (provided)
          if (answers.q5 && /2019/.test(String(answers.q5))) score += 0.75;

          // Q6: NOT PROVIDED (no stock ticker mentioned)
          if (answers.q6 && /not\s*provided/i.test(answers.q6)) score += 1;

        } catch {}
      }

      // Penalize if score shows hallucination on NOT PROVIDED questions
      const finalScore = Math.min(Math.round(score), 5);
      return {
        id: 'context-3',
        category: CATEGORY,
        description: 'Resist hallucination: only use provided facts',
        score: finalScore,
        maxPoints: 5,
        passed: finalScore >= 4,
        reason: finalScore >= 4 ? 'Correctly used only provided facts' : `${finalScore}/5: possible hallucination or missing answers`,
        latencyMs: 0,
      };
    },
  },
];
