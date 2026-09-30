import { existsSync, readFileSync, writeFileSync } from "node:fs";

const GROUP_HISTORY_LIMIT = 40;
const USER_HISTORY_LIMIT = 24;
const FACTS_LIMIT = 40;
const FLUSH_DELAY_MS = 500;
const MAX_STORED_TEXT = 600;

function trimTail(list, limit) {
  return list.length > limit ? list.slice(-limit) : list;
}

export function createMemory(filePath) {
  const store = existsSync(filePath)
    ? JSON.parse(readFileSync(filePath, "utf8"))
    : { groups: {}, users: {} };
  let flushTimer = null;

  function flush() {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    writeFileSync(filePath, JSON.stringify(store, null, 1));
  }

  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
  }

  function group(chatId) {
    return (store.groups[chatId] ??= { history: [], facts: [], pendingFacts: 0 });
  }

  function user(userId) {
    return (store.users[userId] ??= { name: "", history: [] });
  }

  function pushGroup(chatId, entry) {
    const state = group(chatId);
    state.history = trimTail([...state.history, entry], GROUP_HISTORY_LIMIT);
    if (entry.r === "user") state.pendingFacts++;
    scheduleFlush();
  }

  function pushUser(userId, name, entry) {
    const state = user(userId);
    if (name) state.name = name;
    state.history = trimTail([...state.history, entry], USER_HISTORY_LIMIT);
    scheduleFlush();
  }

  function pushUserBot(userId, text) {
    const state = user(userId);
    state.history = trimTail([...state.history, { r: "bot", t: text.slice(0, MAX_STORED_TEXT) }], USER_HISTORY_LIMIT);
    scheduleFlush();
  }

  return {
    rememberGroupMessage(chatId, name, text) {
      pushGroup(chatId, { r: "user", n: name, t: text.slice(0, MAX_STORED_TEXT) });
    },
    rememberBotMessage(chatId, text) {
      pushGroup(chatId, { r: "bot", t: text.slice(0, MAX_STORED_TEXT) });
    },
    rememberUserMessage(userId, name, text) {
      pushUser(userId, name, { r: "user", t: text.slice(0, MAX_STORED_TEXT) });
    },
    rememberUserBotMessage(userId, text) {
      pushUserBot(userId, text);
    },
    groupState(chatId) {
      return group(chatId);
    },
    userHistory(userId) {
      return user(userId).history;
    },
    resetPendingFacts(chatId) {
      group(chatId).pendingFacts = 0;
    },
    addFacts(chatId, fresh) {
      const state = group(chatId);
      state.facts = trimTail([...new Set([...state.facts, ...fresh])], FACTS_LIMIT);
      scheduleFlush();
    },
    resetUser(userId) {
      user(userId).history = [];
      scheduleFlush();
    },
    flush,
  };
}
