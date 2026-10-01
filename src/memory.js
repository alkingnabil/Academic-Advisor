import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { MongoClient } from "mongodb";

const GROUP_HISTORY_LIMIT = 40;
const USER_HISTORY_LIMIT = 24;
const FACTS_LIMIT = 40;
const FLUSH_DELAY_MS = 500;
const MAX_STORED_TEXT = 600;

function trimTail(list, limit) {
  return list.length > limit ? list.slice(-limit) : list;
}

function emptyStore() {
  return { groups: {}, users: {} };
}

function loadFromFile(filePath) {
  if (!existsSync(filePath)) return emptyStore();
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export async function createMemory(filePath, mongoUrl) {
  const mongoClient = mongoUrl
    ? new MongoClient(mongoUrl, { serverSelectionTimeoutMS: 10_000 })
    : null;
  if (mongoClient) await mongoClient.connect();
  const loaded = mongoClient ? await loadFromMongo(mongoClient) : loadFromFile(filePath);
  const store = { groups: loaded.groups ?? {}, users: loaded.users ?? {} };
  let flushTimer = null;

  async function flush() {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (mongoClient) await flushToMongo();
    else writeFileSync(filePath, JSON.stringify(store, null, 1));
  }

  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flush().catch((error) => console.error("memory flush failed:", error.message));
    }, FLUSH_DELAY_MS);
  }

  async function flushToMongo() {
    const collection = mongoClient.db().collection("memory");
    await collection.replaceOne({ _id: "store" }, { ...store, _id: "store" }, { upsert: true });
  }

  async function loadFromMongo(client) {
    const doc = await client.db().collection("memory").findOne({ _id: "store" });
    if (!doc) return emptyStore();
    return { groups: doc.groups ?? {}, users: doc.users ?? {} };
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
    close: () => (mongoClient ? mongoClient.close() : undefined),
  };
}
