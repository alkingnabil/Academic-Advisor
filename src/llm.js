const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const TIMEOUT_MS = 45_000;
const RETRY_DELAY_MS = 1_500;

class LlmHttpError extends Error {
  constructor(status, body) {
    super(`LLM ${status}: ${body.slice(0, 200)}`);
    this.name = "LlmHttpError";
    this.status = status;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isTransient(error) {
  if (error instanceof LlmHttpError) return RETRYABLE_STATUSES.has(error.status);
  // TypeError covers network-level fetch failures (connect timeout, DNS) — worth one retry.
  return error.name === "TimeoutError" || error.name === "AbortError" || error.name === "TypeError";
}

async function callCompletions(endpoint, messages, maxTokens) {
  const response = await fetch(`${endpoint.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${endpoint.apiKey}`,
    },
    body: JSON.stringify({
      model: endpoint.model,
      messages,
      temperature: 0.4,
      thinking: { type: "disabled" },
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new LlmHttpError(response.status, await response.text());
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

async function chatOnEndpoint(endpoint, messages, maxTokens) {
  try {
    return await callCompletions(endpoint, messages, maxTokens);
  } catch (error) {
    if (!isTransient(error)) throw error;
    await sleep(RETRY_DELAY_MS);
    return callCompletions(endpoint, messages, maxTokens);
  }
}

export function createLlmClient(config) {
  const endpoints = [{ baseUrl: config.llmBaseUrl, apiKey: config.llmApiKey, model: config.llmModel }];
  if (config.llmFallback) endpoints.push(config.llmFallback);

  async function chat(messages, maxTokens = 1500) {
    let lastError;
    for (const endpoint of endpoints) {
      try {
        return await chatOnEndpoint(endpoint, messages, maxTokens);
      } catch (error) {
        lastError = error;
        console.error(`LLM endpoint failed (${endpoint.model}):`, error.message.slice(0, 100));
      }
    }
    throw lastError;
  }
  return { chat };
}
