# worklog — session memory (quota-max protocol)

## Current scene
- Goal: FCI academic-advisor bot — live in the test group ("Fci CS", user + bot only), pushed to GitHub, Render-ready.
- Status: **pushed to github.com/alkingnabil/Academic-Advisor (main)**; Render blueprint shipped; awaiting the user's battery pass + Render deploy.
- Next steps: 1. user fires the 🧪 + ⚡ battery mention lines (copy-paste, replies judged against المتوقع notes) 2. Render: New → Blueprint → repo → fill the 5 env vars → deploy 3. STOP the local bot when Render takes over (two pollers = Telegram 409 conflict)
- Blockers: none user-side.
- Unverified: live mention replies through the real group (model suite passed 5/5 + 5/5 server-side, channel caveat documented).

## Recent entries
- T-002 2026-10-01: pushed to GitHub after history purge (raw student chat removed from ALL commits — verified PURGED), secrets sweep clean, README + render.yaml added, machine-specific tools gitignored.
- T-001 2026-09-30: build sessions — KB distilled (leaders + CS FAQ, د آمال top authority), no-leak rule enforced (persona rule 8), bot code (grammY, Atria-Dawn-Preview, thinking-off, 1500/800 budgets), extreme edge-case batteries delivered to the test group (message_ids 89–110).

## Learnings
- Provider: Atria (`https://api.atria-asi.ai/v1`, model `Atria-Dawn-Preview`) — reasoning model: `thinking: {type:"disabled"}` required + max_tokens ≥ 1500 or content comes back empty.
- dahl (`inference.dahl.global/v1`) was at capacity (429 model_concurrency) — preserved in .env `# prev` comments.
- Group privacy mode must be disabled via BotFather or the bot can't see non-mention messages.
- Telegram Web composer cannot be automated by injected text (fill/CUA type render DOM but app state never registers it — Enter/Ctrl+Enter/send-button all no-ops). Sends go through the Bot API.
- No-leak: persona rule 8 + raw chats untracked + history purged. KB never quotes source chats.

### Handoff T-002 — 2026-10-01
- Done: GitHub push (main), README + render.yaml, history purge verified, secrets sweep clean, memory wiped before students, extreme batteries (21 cases) delivered to the group as copy-paste lines with expected-behavior notes.
- Files: src/ (7 modules, syntax + import verified), knowledge/ (5 files, 8.2k tokens, 0/0 leak scan), tools/ (kb:build, kb:size, smoke-offline — generic only; machine-specific tools gitignored), docs/adr/, AGENTS.md, ROADMAP.md.
- Unverified: live mention round-trip (needs the battery fired — user's eyes are the proof channel).
- Blockers: none.
- Next: 1. battery pass in the group 2. Render blueprint deploy (env vars from local .env) 3. stop local bot on Render takeover 4. final memory review-and-clean before adding students (ask for the memory cleanup pass).
- Commands that work: `npm start`, `npm run kb:size`, `npm run kb:build`, `node tools/smoke-offline.mjs` (assertion counts buggy; judge behavior not counts).
