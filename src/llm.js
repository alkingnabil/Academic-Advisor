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
  return error.name === "TimeoutError" || error.name === "AbortError";
}

async function callCompletions(config, messages, maxTokens) {
  const response = await fetch(`${config.llmBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.llmApiKey}`,
    },
    body: JSON.stringify({
      model: config.llmModel,
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

export function createLlmClient(config) {
  async function chat(messages, maxTokens = 1500) {
    try {
      return await callCompletions(config, messages, maxTokens);
    } catch (error) {
      if (!isTransient(error)) throw error;
      await sleep(RETRY_DELAY_MS);
      return callCompletions(config, messages, maxTokens);
    }
  }
  return { chat };
}
