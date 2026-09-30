import { mkdirSync } from "node:fs";
import { loadConfig } from "./config.js";
import { createLlmClient } from "./llm.js";
import { createMemory } from "./memory.js";
import { buildSystemPrompt } from "./persona.js";
import { startKeepalive } from "./keepalive.js";
import { createBot } from "./bot.js";

const config = loadConfig();
mkdirSync("data", { recursive: true });

const memory = createMemory("data/memory.json");
const llm = createLlmClient(config);
const bot = createBot(config, { memory, llm, systemPromptFor: buildSystemPrompt });
const keepalive = startKeepalive(config.port);

async function shutdown() {
  console.log("shutting down…");
  await bot.stop();
  memory.flush();
  keepalive.close();
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

bot
  .init()
  .then(() => {
    console.log(
      `advisor bot up: @${bot.botInfo.username} | model ${config.llmModel} | groups ${[...config.allowedChats].join(",")}`,
    );
    return bot.start({ onStart: () => console.log("polling started") });
  })
  .catch((error) => {
    console.error("startup failed:", error.message);
    memory.flush();
    keepalive.close();
    process.exit(1);
  });
