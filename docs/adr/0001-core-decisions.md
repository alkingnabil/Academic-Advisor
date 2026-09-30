# ADR-0001 — Core runtime decisions — 2026-09-30

## Long polling, not webhooks
Render free tier + local dev both work with polling; no TLS/domain needed. The keep-alive HTTP
server exists only to satisfy Render's port binding. Revisit if we ever need webhook-only scale.

## JSON files over SQLite for memory
Scale is one group + DMs (tens of messages/day). A debounced JSON store (`data/*.json`) keeps
zero native deps (better-sqlite3 build pain on Windows avoided). Revisit if data/ exceeds a few
MB or we need concurrent writers.

## OpenAI-compatible client, hand-rolled on fetch
One endpoint (dahl `/v1/chat/completions`), one call shape. The OpenAI SDK adds nothing but
weight; `fetch` (Node 20+) + ~30 lines is the whole client. Revisit only if we add
streaming/tool-calls.

## Knowledge in the system prompt, no RAG
Full KB ≈ 8–10k tokens — cheap relative to per-message correctness, and course/regulation
answers demand whole-document grounding (a prerequisite chain spans the whole map). Revisit if
the KB triples.
