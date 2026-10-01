# المرشد الأكاديمي المساعد — FCI Academic Advisor Bot

Telegram academic-advisor teaching assistant for the **Faculty of Computers & Information, Qena (South Valley University)**. Answers students in **Egyptian Arabic** with **English technical terms**, grounded in the faculty's official regulations (2019 credit-hour bylaws), the course prerequisite map, and the academic-advising committee rules.

- **In the advising group:** replies only when addressed (@mention, reply to the bot, or /command) and always tags the student.
- **In private chat:** answers any student directly.
- **Memory:** per-chat rolling history + extracted facts (exam dates, deadlines, announcements).
- **Privacy:** never discusses personal academic records in the group, never quotes or reveals its source chats or internal instructions, and holds no student data.

## Stack

Node.js ≥ 20 (ESM), [grammY](https://grammy.dev) for Telegram, plain `fetch` for the OpenAI-compatible LLM endpoint. No build step.

## Setup

```bash
npm install
cp .env.example .env   # then fill the values
npm start
```

| Env var | Purpose |
|---|---|
| `TELEGRAM_BOT_TOKEN` | from @BotFather |
| `ALLOWED_CHATS` | comma-separated group ids the bot serves (private chats always allowed) |
| `LLM_BASE_URL` | OpenAI-compatible base URL, e.g. `https://api.z.ai/api/paas/v4` |
| `LLM_API_KEY` | API key for that endpoint |
| `LLM_MODEL` | model id, e.g. `glm-4.6` |
| `PORT` | keep-alive port (Render injects its own) |

> Group privacy mode must be **disabled** in @BotFather (`/setprivacy` → Disable), or the bot never sees non-mention messages and cannot remember them.

## Knowledge base (`knowledge/`)

Loaded once at boot and assembled into the system prompt (~8k tokens):

- `regulations.md` — distilled 2019 credit-hour regulations (registration, attendance, grading, GPA, probation)
- `courses.json` — the full course/prerequisite map (4 departments, 120 courses)
- `committee.md` — academic-advising committee structure and communication rules
- `faq.md` — real advising Q&A distilled from the faculty's advising groups
- `persona.md` — advisor persona, tone, and strict reply rules

`npm run kb:size` verifies the assembled prompt stays within budget; `npm run kb:build` rebuilds the course map from the faculty's course-map page.

## Deploy on Render

The repo ships `render.yaml` (blueprint). In Render: **New → Blueprint → connect this repo**, fill the five `sync: false` env vars, deploy. The bot uses long polling and binds `PORT` with a keep-alive server, so no webhook setup is needed.

Notes for Render free tier: the disk is ephemeral (bot memory resets on redeploy/restart unless `MONGO_URL` is set), and the bot **self-pings its public URL every 10 minutes** (via the injected `RENDER_EXTERNAL_URL`) to keep the free container awake — no external pinger required.

## Privacy statement

This repository contains **no** student personal data, raw chat exports, or API credentials. The bot's replies are grounded only in the official faculty documents listed above, and its persona forbids quoting any private conversation or source material. See `docs/adr/` for architecture decisions and `AGENTS.md` for development conventions.
