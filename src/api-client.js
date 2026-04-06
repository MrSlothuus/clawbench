/**
 * OpenAI-compatible API client with retry logic.
 * Accepts any endpoint that speaks the /v1/chat/completions protocol.
 */

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

async function chatCompletion(apiUrl, model, messages, apiKey, timeoutMs = 60000) {
  const url = apiUrl.replace(/\/+$/, '') + '/v1/chat/completions';

  let lastError;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1);
      await new Promise(r => setTimeout(r, delay));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages,
          temperature: 0,
          max_tokens: 4096,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`API returned ${res.status}: ${await res.text()}`);
        lastError.retryable = true;
        continue;
      }

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`API error ${res.status}: ${body}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      const modelUsed = data.model || model;
      return { content, modelUsed };
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error(`API request timed out after ${timeoutMs}ms`);
      }
      lastError = err;
      if (!err.retryable) throw err;
    }
  }

  throw lastError || new Error('API request failed after retries');
}

module.exports = { chatCompletion };
