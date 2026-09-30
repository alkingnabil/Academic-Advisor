# worklog — session memory (quota-max protocol)

## Current scene
- Goal: build + ship the FCI academic-advisor Telegram bot (group -1003657081670 + DMs, ar-EG, GLM-5.3-Flash via dahl).
- Status: in-progress (M0)
- Now doing: M0 scaffold → git init → M1 knowledge base
- Next steps: 1. M1 knowledge files (docx, zips, course-map scrape, committee) 2. M2 bot core + smoke test 3. M3 brain (llm/persona/memory)
- Blockers: none
- Unverified: none yet

## Recent entries

## Learnings
- dahl provider config: `https://inference.dahl.global/v1`, model `zai-org/GLM-5.3-Flash`, key in ZCode's provider_config.json (never echo; lives in .env only).
- Group privacy mode must be disabled via BotFather or the bot can't see/remember normal group messages.
