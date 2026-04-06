/**
 * OpenClaw gateway client — routes all requests through the OpenClaw gateway.
 *
 * Uses the OpenAI-compatible /v1/chat/completions endpoint exposed by the gateway.
 * The `model` field targets an OpenClaw agent (e.g. "openclaw/default").
 * The optional `modelOverride` is sent as x-openclaw-model to control which
 * backend provider/model the agent uses for this request.
 *
 * This ensures all benchmark traffic goes through OpenClaw's full middleware:
 * - Thinking-block stripping (MiniMax reasoning leak fix)
 * - Retry and fallback logic
 * - Provider routing and auth
 */

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

async function chatCompletion(gatewayUrl, agentTarget, messages, gatewayToken, timeoutMs = 90000, modelOverride = null) {
  const url = gatewayUrl.replace(/\/+$/, '') + '/v1/chat/completions';

  let lastError;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1);
      await new Promise(r => setTimeout(r, delay));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${gatewayToken}`,
      };

      // If a model override is specified, send it as x-openclaw-model so the
      // gateway uses that backend model instead of the agent's default.
      if (modelOverride) {
        headers['x-openclaw-model'] = modelOverride;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: agentTarget,  // routes to OpenClaw agent, e.g. "openclaw/default"
          messages,
          temperature: 0,
          max_tokens: 4096,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`Gateway returned ${res.status}: ${await res.text()}`);
        lastError.retryable = true;
        continue;
      }

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Gateway error ${res.status}: ${body}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      const modelUsed = data.model || agentTarget;
      return { content, modelUsed };
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error(`Gateway request timed out after ${timeoutMs}ms`);
      }
      lastError = err;
      if (!err.retryable) throw err;
    }
  }

  throw lastError || new Error('Gateway request failed after retries');
}

module.exports = { chatCompletion };
