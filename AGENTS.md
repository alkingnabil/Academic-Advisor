# AGENTS.md — FCI Academic Advisor Telegram Bot

المرشد الأكاديمي المساعد — Telegram bot for the Faculty of Computers & Information, Qena
University. Answers students as an academic-advisor teaching assistant: group `-1003657081670`
(reply only when addressed) and private chats (always reply). Egyptian Arabic, technical terms
in English. LLM: GLM-5.3-Flash via the dahl OpenAI-compatible endpoint.

## Stack

Node.js >= 20 (ESM, `"type": "module"`), grammY (Telegram), dotenv. No build step, no TS.

## Commands

| Command | What it does |
|---|---|
| `npm start` | run the bot (long polling + keep-alive server on `PORT`) |
| `node --check src/index.js` | syntax gate before every commit |
| `npm run kb:build` | rebuild `knowledge/courses.json` from the course-map site |
| `npm run kb:size` | print estimated token size of the assembled system prompt |

## Structure

```
src/
  index.js      bootstrap: config → memory → bot → keepalive
  config.js     env load + fail-fast validation
  bot.js        grammY setup, address-gating (group vs private)
  llm.js        OpenAI-compatible chat client (dahl)
  persona.js    system prompt builder = persona + knowledge files
  memory.js     per-chat rolling history + facts store (JSON, debounced flush)
  keepalive.js  node:http server for Render
knowledge/      persona.md, committee.md, regulations.md, courses.json, faq.md
data/           runtime memory (gitignored, auto-created)
tools/          one-off scripts (kb build, checks)
```

## Env vars (`.env`, never committed — see `.env.example`)

- `TELEGRAM_BOT_TOKEN` — from @BotFather.
- `ALLOWED_CHATS` — comma-separated group ids the bot serves; private chats always allowed.
- `LLM_BASE_URL` — dahl: `https://inference.dahl.global/v1`
- `LLM_API_KEY` — dahl key (`dahl_…`).
- `LLM_MODEL` — `zai-org/GLM-5.3-Flash`.
- `PORT` — keep-alive port (Render injects its own).

## Conventions

- Functions ≤ 20 lines, ≤ 4 params, names reveal intent (clean-code-guard applies to every
  diff before commit; report the pass line in the commit message body).
- All Arabic persona/tone text lives in `knowledge/*.md`, never hardcoded in `src/`.
- Knowledge files load once at boot; assembled system prompt must stay ≤ ~10k tokens
  (`npm run kb:size` verifies).
- Memory writes are debounced (500 ms) — never `JSON.stringify` per message.
- Errors: catch only what you can recover from; if the LLM call fails, tell the student in
  Arabic and log the cause — never swallow.
- Boundary validation only at trust edges (Telegram updates, LLM responses, env loading).

## Gotchas (verified lessons — append as discovered)

- Telegram group **privacy mode** must be disabled (BotFather `/setprivacy` → Disable) or the
  bot never sees non-mention messages, so it cannot remember them.
- dahl key lives in ZCode's provider config; in this repo it exists only in `.env`.
