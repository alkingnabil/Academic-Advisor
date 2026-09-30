import { mkdirSync } from "node:fs";
import { loadConfig } from "../src/config.js";
import { createMemory } from "../src/memory.js";
import { buildSystemPrompt } from "../src/persona.js";
import { createBot } from "../src/bot.js";

const config = loadConfig();
mkdirSync("data", { recursive: true });
const memory = createMemory("data/smoke-memory.json");
const FAKE_REPLY = "رد تجريبي: التسجيل يبدأ السبت بإذن الله.";
const llm = { chat: async () => FAKE_REPLY };
const bot = createBot(config, { memory, llm, systemPromptFor: buildSystemPrompt });

const sent = [];
bot.api.config.use((prev, method, payload) => {
  if (method === "getMe") return prev(method, payload);
  sent.push({ method, text: payload.text, replyTo: payload.reply_to_message_id });
  return { ok: true, result: true };
});

await bot.init();
const me = bot.botInfo;
console.log(`getMe OK: @${me.username} (id ${me.id})`);

const groupId = config.allowedChats.values().next().value;
const otherGroup = -999888777;
const base = {
  date: Math.floor(Date.now() / 1000),
  chat: { id: groupId, type: "supergroup", title: "smoke" },
};
const from = { id: 777, is_bot: false, first_name: "أحمد", username: "ahmed_t" };
const update = (id, text, extra = {}) => ({
  update_id: id,
  message: { ...base, message_id: id, from, text, ...extra },
});

let failures = 0;
function check(name, condition, detail = "") {
  if (condition) console.log(`PASS ${name}`);
  else {
    failures++;
    console.error(`FAIL ${name} ${detail}`);
  }
}

// 1. unaddressed group message: remembered, no reply
await bot.handleUpdate(update(1, "السلام عليكم يا جماعة"));
check("unaddressed: no reply", sent.length === 0, JSON.stringify(sent));
check("unaddressed: remembered", memory.groupState(groupId).history.length === 1);

// 2. @mention: replied with tag + reply_to
const mention = `@${me.username} إمتى التسجيل؟`;
await bot.handleUpdate(update(2, mention, {
  entities: [{ offset: 0, length: mention.indexOf(" "), type: "mention" }],
}));
const mentionReply = sent.at(-1);
check("mention: replied", sent.length === 1, JSON.stringify(sent));
check("mention: tagged @username", mentionReply?.text.startsWith("@ahmed_t"), mentionReply?.text);
check("mention: reply_to set", mentionReply?.replyTo === 2);
check("mention: bot msg remembered", memory.groupState(groupId).history.at(-1)?.r === "bot");

// 3. reply-to-bot: replied
const replyToBot = update(3, "وبعدين؟", {
  reply_to_message: { ...base, message_id: 99, from: { id: me.id, is_bot: true, first_name: me.first_name }, text: "رد قديم" },
});
await bot.handleUpdate(replyToBot);
check("reply-to-bot: replied", sent.length === 2, JSON.stringify(sent));

// 4. /start in group: intro, no LLM
await bot.handleUpdate(update(4, "/start", { entities: [{ offset: 0, length: 6, type: "bot_command" }] }));
const startReply = sent.at(-1);
check("/start: replied", sent.length === 3);
check("/start: no fake LLM text", !startReply?.text.includes(FAKE_REPLY));

// 5. foreign group: fully ignored
const foreign = {
  update_id: 5,
  message: { ...base, chat: { id: otherGroup, type: "supergroup", title: "x" }, message_id: 5, from, text: "@x هلوا" },
};
await bot.handleUpdate(foreign);
check("foreign group: ignored", sent.length === 3 && !memory.groupState(otherGroup).history.length);

// 6. private /reset then question
const priv = {
  date: base.date,
  chat: { id: 777, type: "private" },
  from,
};
await bot.handleUpdate({ update_id: 6, message: { ...priv, message_id: 6, text: "/reset", entities: [{ offset: 0, length: 6, type: "bot_command" }] } });
check("/reset private: confirmed", sent.length === 4 && sent.at(-1).text.includes("تم مسح"));
await bot.handleUpdate({ update_id: 7, message: { ...priv, message_id: 7, text: "المعدل بيتحسب إزاي؟" } });
check("private: replied untagged", sent.length === 5 && !sent.at(-1).text.startsWith("@"));
check("private: isolated memory", memory.userHistory(777).length === 1);

memory.flush();
console.log(failures ? `SMOKE FAILED: ${failures}` : "SMOKE ALL PASS");
process.exitCode = failures ? 1 : 0;
