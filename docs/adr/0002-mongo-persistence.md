# ADR-0002 — Mongo persistence for bot memory — 2026-10-01

## Decision
Bot memory (per-chat history + facts) persists to **MongoDB Atlas** (collection `memory`,
single `_id: "store"` document holding the whole store) when `MONGO_URL` is set. Without
`MONGO_URL`, `memory.js` falls back to the original JSON file store (`data/memory.json`) so
local offline development keeps working unchanged.

## Context
ADR-0001 chose JSON files over a database when the bot ran locally. Deploying on Render
changes the constraint: the free tier's disk is **ephemeral**, so file-based memory resets on
every redeploy/restart — unacceptable once real students use the advisor.

## Why MongoDB over Neon/Postgres
- The store is already document-shaped (`groups`/`users` maps) — zero impedance mismatch:
  `flush()` = one `replaceOne` upsert of the whole store, `load()` = one `findOne`.
- The owner already operates an Atlas cluster (same credentials, dedicated
  `academic-advisor-bot` database), M0 free tier.
- Pure-JS driver — no native builds on Render.

Neon/Postgres becomes the right choice only if the project grows **relational** data (per-student
records, cross-student queries, committee reports). Revisit on that trigger.

## Properties
- Public API of `memory.js` unchanged; `createMemory(filePath, mongoUrl)` is now async.
- Debounced flush retained (~one write per activity burst); flush errors are logged, not
  silent, and the next mutation reschedules.
- Connection is fail-fast at boot (`serverSelectionTimeoutMS: 10s`) — the bot does not run
  with silently-degraded persistence.
- Single poller guaranteed (Telegram 409), so whole-store upserts have no writer races.

## Credential hygiene
`MONGO_URL` lives only in `.env` / Render env vars (password URL-encoded). Never committed;
`.env.example` carries an empty placeholder.
