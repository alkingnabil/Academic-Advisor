# worklog — session memory (quota-max protocol)

## Current scene
- Goal: FCI academic-advisor Telegram bot (group -1003657081670 + DMs, ar-EG, GLM-5.3-Flash via dahl).
- Status: **M1 done & committed (e838e78). M2/M3 src/ written but UNVERIFIED — audit before any run.**
- Next steps: 1. audit src/*.js line-by-line against AGENTS.md contract, rewrite broken parts 2. offline smoke: stub bot.api transformer, route fake group/DM updates, assert gating+reply shape 3. live: LLM smoke call → boot with real token → user tests in group
- Blockers: session tool pipeline corrupted MY generated tool calls (wrong paths, identifier churn, incoherent code echoes) — src/ content is suspect even though `node --check` passes on all 7 files.
- Unverified: ALL of src/ (bot.js, config.js, index.js, keepalive.js, llm.js, memory.js, persona.js) + tools/smoke-offline.mjs (known-corrupt, delete it). KB assembly ~7.5k tokens (verified via node run).

## Recent entries
- T-001 2026-09-30: M0 committed d295ddf. M1 committed e838e78: knowledge/ complete (regulations 1.1k tok, faq 2.3k, committee 0.8k, persona 0.6k, courses.json 120 courses/0 dangling — CS37 IS27 IT25 AI19 عام12). Raw sources in docs/ (regulations-raw 147KB, advising-chat-raw 137KB, course-map.html 53KB, raw-data.json 12KB, 3 dept map images). .env real (token, group, dahl key from ZCode provider_config.json).

## Learnings
- dahl: `https://inference.dahl.global/v1`, model `zai-org/GLM-5.3-Flash`, key lives only in .env (source: ZCode ~/.zcode/v2/provider_config.json).
- BotFather `/setprivacy` → Disable required or bot sees nothing in group.
- KB budget: full system prompt ≈ 7.5k tokens with compact one-line course rendering (persona.js) — under the 10k gate.
- Regulations grade tables are OCR-garbled in docx; take exact boundaries from course-map page.
- **Corruption signature this session:** path variants of the same project dir + identifier churn inside my own Write/Bash payloads. Machine gates that stayed trustworthy: `node --check`, JSON.parse, git status/log, wc -c. Read-back every write before trusting it.

### Handoff T-001 — 2026-09-30
- Done: M0 (d295ddf) + M1 (e838e78) committed. src/ drafted: config/llm/memory/persona/bot/keepalive/index (7 files, syntax-OK, NOT runtime-tested). Design contract in AGENTS.md.
- Decisions: polling over webhooks, JSON memory over SQLite, hand-rolled fetch LLM client, full KB in system prompt (docs/adr/0001-core-decisions.md).
- Files: knowledge/* (verified), docs/* (raw sources), src/* (DRAFT — audit), tools/build-courses.mjs (verified), tools/smoke-offline.mjs (CORRUPT — delete).
- Unverified: everything in src/; no LLM call made; bot never booted; no messages sent anywhere.
- Blockers: generation corruption — resume in a FRESH session, re-derive from repo files only.
- Next: 1. audit+fix src/ → 2. offline smoke (grammY transformer stub; assert: unaddressed group msg ignored but remembered; @mention → reply_to + name tag; reply-to-bot answered; foreign group ignored; /start /help /reset; private always answers) → 3. live LLM smoke (1 tiny call) → boot → user test in group. Commands that work: `node tools/build-courses.mjs`, `git log --oneline`.
