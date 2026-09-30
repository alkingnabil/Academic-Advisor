import { Bot } from "grammy";

const HISTORY_WINDOW = 16;
const FACTS_TRIGGER = 4;
const FACTS_RECENT_WINDOW = 12;
const TELEGRAM_LIMIT = 4096;
const REPLY_CHUNK = 3_800;

const ARABIC_ERROR = "معلش، حصلت مشكلة تقنية في اللحظة دي. جرب تاني بعد شوية 🙏";

function displayName(from) {
  return from?.username ? `@${from.username}` : from?.first_name || "طالب";
}

function isCommand(text) {
  return typeof text === "string" && text.startsWith("/");
}

function isAddressed(ctx, msg) {
  if (msg.reply_to_message?.from?.id === ctx.me.id) return true;
  return (
    msg.entities?.some((entity) => {
      if (entity.type !== "mention" && entity.type !== "text_mention") return false;
      return msg.text.slice(entity.offset, entity.offset + entity.length) === `@${ctx.me.username}`;
    }) ?? false
  );
}

function mergeConsecutive(messages) {
  const merged = [];
  for (const message of messages) {
    const last = merged[merged.length - 1];
    if (last && last.role === message.role) last.content += `\n${message.content}`;
    else merged.push({ ...message });
  }
  return merged;
}

function historyToLlm(history) {
  const messages = history.map((entry) =>
    entry.r === "bot"
      ? { role: "assistant", content: entry.t }
      : { role: "user", content: `[${entry.n}]: ${entry.t}` },
  );
  return mergeConsecutive(messages);
}

function splitReply(text) {
  if (text.length <= TELEGRAM_LIMIT) return [text];
  const chunks = [];
  let rest = text;
  while (rest.length > REPLY_CHUNK) {
    let cut = rest.lastIndexOf("\n", REPLY_CHUNK);
    if (cut < REPLY_CHUNK / 2) cut = REPLY_CHUNK;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).trimStart();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

async function sendReply(ctx, reply, replyToId, name) {
  const parts = splitReply(`${name} ${reply}`.trim());
  await ctx.api.sendMessage(ctx.chat.id, parts[0], { reply_to_message_id: replyToId });
  for (const part of parts.slice(1)) {
    await ctx.api.sendMessage(ctx.chat.id, part);
  }
}

function factsPrompt(facts, recent) {
  return [
    "انت بتساعد بوت إرشاد أكاديمي يفتكر الإعلانات والقرارات الثابتة من مجموعة الطلاب.",
    "المعروف بالفعل:",
    facts.length ? facts.map((fact) => `- ${fact}`).join("\n") : "- لا شيء",
    "",
    "آخر الرسائل:",
    recent,
    "",
    "استخرج الحقائق الجديدة الثابتة فقط (مواعيد، قرارات، لينكات، أسماء مسؤولين، قواعد).",
    "رد بـ JSON array من جمل قصيرة بالعربي. لو مفيش جديد رد []. بدون أي شرح.",
  ].join("\n");
}

function parseFacts(raw, existing) {
  const cleaned = raw.replace(/```(?:json)?/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end <= start) {
    console.warn("facts: no array in reply:", cleaned.slice(0, 80));
    return [];
  }
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return [...new Set(parsed)]
      .filter((fact) => typeof fact === "string" && fact.trim().length > 3 && !existing.includes(fact))
      .slice(0, 5);
  } catch {
    console.warn("facts: bad JSON:", cleaned.slice(0, 80));
    return [];
  }
}

async function maybeExtractFacts(chatId, deps) {
  if (deps.memory.groupState(chatId).pendingFacts < FACTS_TRIGGER) return;
  const { history, facts } = deps.memory.groupState(chatId);
  deps.memory.resetPendingFacts(chatId);
  const recent = history
    .slice(-FACTS_RECENT_WINDOW)
    .map((entry) => (entry.r === "bot" ? `البوت: ${entry.t}` : `[${entry.n}]: ${entry.t}`))
    .join("\n");
  const raw = await deps.llm.chat([{ role: "user", content: factsPrompt(facts, recent) }], 800);
  const fresh = parseFacts(raw, facts);
  if (fresh.length) deps.memory.addFacts(chatId, fresh);
}

async function generate(key, deps, { isGroup, facts }) {
  const history = isGroup ? deps.memory.groupState(key).history : deps.memory.userHistory(key);
  const messages = [
    { role: "system", content: deps.systemPromptFor({ isGroup, facts }) },
    ...historyToLlm(history.slice(-HISTORY_WINDOW)),
  ];
  return deps.llm.chat(messages);
}

async function answerAddressed(ctx, deps, key, isGroup) {
  await ctx.replyWithChatAction("typing");
  const facts = isGroup ? deps.memory.groupState(key).facts : [];
  try {
    const reply = await generate(key, deps, { isGroup, facts });
    if (isGroup) {
      deps.memory.rememberBotMessage(key, reply);
      maybeExtractFacts(key, deps).catch((error) => console.error("facts:", error.message));
    } else {
      deps.memory.rememberUserBotMessage(key, reply);
    }
    return sendReply(ctx, reply, ctx.message.message_id, displayName(ctx.from));
  } catch (error) {
    console.error("reply failed:", error.message);
    return ctx.reply(`${displayName(ctx.from)} ${ARABIC_ERROR}`, {
      reply_to_message_id: ctx.message.message_id,
    });
  }
}

async function handlePrivate(ctx, deps) {
  const msg = ctx.message;
  if (!msg.text) return ctx.reply("ابعتلي سؤالك كتابة وأنا معاك 👌");
  if (isCommand(msg.text)) return;
  deps.memory.rememberUserMessage(ctx.from.id, displayName(ctx.from), msg.text);
  return answerAddressed(ctx, deps, ctx.from.id, false);
}

async function handleGroup(ctx, deps) {
  const msg = ctx.message;
  if (isCommand(msg.text)) return;
  const name = displayName(ctx.from);
  deps.memory.rememberGroupMessage(ctx.chat.id, name, msg.text ?? "[صورة/ملف]");
  if (!isAddressed(ctx, msg)) return;
  if (!msg.text) {
    return ctx.reply(`${name} ابعت سؤالك كتابة وأنا هجاوبك`, {
      reply_to_message_id: msg.message_id,
    });
  }
  return answerAddressed(ctx, deps, ctx.chat.id, true);
}

async function routeMessage(ctx, config, deps) {
  if (ctx.chat.type === "private") return handlePrivate(ctx, deps);
  if (!config.allowedChats.has(ctx.chat.id)) return;
  return handleGroup(ctx, deps);
}

function introText(username, isPrivate) {
  if (isPrivate) {
    return (
      "أهلاً بيك 👋 أنا المرشد الأكاديمي المساعد لكلية الحاسبات والمعلومات جامعة قنا.\n" +
      "اسألني عن التسجيل، المقررات والمتطلبات السابقة (Prerequisites)، المعدل التراكمي (GPA)، " +
      "أو أي حاجة عن الخطة الدراسية."
    );
  }
  return (
    `أهلاً 👋 أنا المرشد الأكاديمي المساعد لكلية الحاسبات والمعلومات. ` +
    `اعمل منشن ليا @${username} واسأل أي حاجة عن التسجيل أو المقررات أو المعدل، وهجاوبك على طول.`
  );
}

function helpText() {
  return [
    "أنا المرشد الأكاديمي المساعد لكلية الحاسبات والمعلومات 🎓",
    "- في الجروب: اعمل منشن ليا أو رد على رسالة ليا وهجاوبك.",
    "- في الخاص: ابعتلي سؤالك في أي وقت.",
    "- أساعدك في: التسجيل والحذف والإضافة، المتطلبات السابقة، المعدل التراكمي والتقديرات،",
    "  خريطة المقررات، التدريب ومشروع التخرج.",
    "- /reset (في الخاص): مسح محادثتك معايا.",
    "- الحالات الفردية اللي محتاجة سجل أكاديمي بتتراجع مع المرشد المسؤول بصورة فردية.",
  ].join("\n");
}

function handleReset(ctx, memory) {
  if (ctx.chat.type !== "private") {
    return ctx.reply("ابعت /reset في الخاص لمسح محادثتك معايا");
  }
  memory.resetUser(ctx.from.id);
  return ctx.reply("تم مسح محادثتك معايا 👌 اسأل براحتك");
}

export function createBot(config, deps) {
  const bot = new Bot(config.botToken);

  bot.command("start", (ctx) => ctx.reply(introText(ctx.me.username, ctx.chat.type === "private")));
  bot.command("help", (ctx) => ctx.reply(helpText()));
  bot.command("reset", (ctx) => handleReset(ctx, deps.memory));

  bot.on("message", (ctx) => routeMessage(ctx, config, deps));

  bot.catch((error) => {
    console.error("bot error:", error.error ?? error);
  });
  return bot;
}
