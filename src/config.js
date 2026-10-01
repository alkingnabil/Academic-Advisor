import "dotenv/config";

function mustEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function parseAllowedChats(raw) {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((id) => Number(id.trim()))
      .filter((id) => Number.isInteger(id) && id !== 0),
  );
}

export function loadConfig() {
  return {
    botToken: mustEnv("TELEGRAM_BOT_TOKEN"),
    allowedChats: parseAllowedChats(process.env.ALLOWED_CHATS),
    llmBaseUrl: mustEnv("LLM_BASE_URL").replace(/\/+$/, ""),
    llmApiKey: mustEnv("LLM_API_KEY"),
    llmModel: mustEnv("LLM_MODEL"),
    llmFallback: process.env.LLM_FALLBACK_URL
      ? {
          baseUrl: process.env.LLM_FALLBACK_URL.replace(/\/+$/, ""),
          apiKey: mustEnv("LLM_FALLBACK_API_KEY"),
          model: mustEnv("LLM_FALLBACK_MODEL"),
        }
      : null,
    mongoUrl: process.env.MONGO_URL || "",
    port: Number(process.env.PORT ?? 3000),
  };
}
