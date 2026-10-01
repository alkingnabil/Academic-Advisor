# ADR-0003 — LLM provider fallback chain — 2026-10-01

## Decision
`llm.js` iterates **provider endpoints** instead of calling a single one: primary (Atria /
Atria-Dawn-Preview) then fallback (SailResearch / GLM-5.3), configured via
`LLM_FALLBACK_URL` + `LLM_FALLBACK_API_KEY` + `LLM_FALLBACK_MODEL`. The first endpoint that
returns a completion wins; every failure is logged with the model name.

## Context
During the Render-deployment testing window, the primary endpoint (api.atria-asi.ai) had a
sustained outage (connect timeouts on every probe for 25+ minutes). The single-provider
client surfaced that outage directly to students as failed replies. Atria's reachability is
intermittent by observation (HTTP 200 one minute, connect timeout the next).

## Mechanics
- Per endpoint: one retry on transient failures (429/5xx, timeouts, and now network-level
  `fetch failed` TypeErrors — connect timeouts were previously **not** retried).
- On endpoint failure (any error): log and move to the next endpoint. The last error is
  rethrown only after all endpoints fail, so the bot's Arabic error message remains the
  final student-facing behavior.
- Fallback credentials live only in `.env` / Render env vars — never committed.

## Consequences
- Students see answers during primary outages (answers come from the fallback model).
- Answer voice may shift slightly while on fallback (different GLM host, same persona
  prompt) — accepted trade-off vs. silence.
- A single fallback slot is deliberate (KISS); extend `providerEndpoints()` to a list when
  a second fallback is actually needed.
