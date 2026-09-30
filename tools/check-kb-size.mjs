import { buildSystemPrompt } from "../src/persona.js";

const prompt = buildSystemPrompt({ isGroup: true, facts: ["عينة حقيقة لقياس الحجم"] });
const tokens = Math.round(prompt.length / 3.5);
console.log("system prompt chars:", prompt.length, "≈ tokens:", tokens);
if (tokens > 10_000) {
  console.error("KB OVER BUDGET (target ≤ 10k tokens)");
  process.exit(1);
}
