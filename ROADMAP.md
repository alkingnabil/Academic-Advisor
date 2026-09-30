# ROADMAP — FCI Academic Advisor Telegram Bot

One milestone per session-sized chunk; each ends verified → committed → worklog handoff.
Statuses: `pending` / `in-progress` / `done`.

## M0 — INIT — `in-progress`
Scaffold: AGENTS.md, ROADMAP.md, worklog.md, ADR-0001, package.json, .env(+example),
.gitignore, git init.
**Accept:** `node --check` passes on empty bootstrap; git history starts with M0 commit.

## M1 — Knowledge base — `done` (commit e838e78)
- `knowledge/committee.md` (from لجنة الإرشاد الأكاديمي PDF — advising rules, group usage, confidentiality).
- `knowledge/regulations.md` (from الائحة 27-08-2019 docx — credit-hour rules, grading, GPA, probation).
- `knowledge/courses.json` (scraped from the course-map site: 4 departments, prerequisites, hours).
- `knowledge/faq.md` (from the two WhatsApp chat exports: real advising Q&A, tone samples).
- `knowledge/persona.md` (ar-EG advisor persona, reply rules, privacy rules).
**Accept:** all files exist; `npm run kb:size` reports ≤ ~10k tokens; courses.json parses.

## M2 — Bot core — `in-progress` (draft written, **UNVERIFIED**)
⚠️ Session tool pipeline corrupted generated code; all of `src/` passed `node --check` only.
Audit line-by-line against AGENTS.md before running. Offline smoke design: capture grammY
transformer calls (no real sends), assert mention→tagged reply, unaddressed→silent, /reset.
grammY long polling; address gating (group: @mention | reply-to-bot | /command only; private:
always); tagged replies (reply_to + @username/first name); /start /help /reset.
**Accept:** live smoke — unaddressed group message ignored; mention produces tagged echo.

## M3 — Brain — `pending`
`llm.js` (dahl client, live endpoint test), `persona.js` (loads knowledge/), `memory.js`
(rolling 50-msg window per chat, fact extraction after replies, per-user private isolation,
debounced JSON flush).
**Accept:** E2E — group mention answered in ar-EG grounded in the KB; private chat answered;
a fact told in the group is recalled later; LLM failure returns an Arabic error message.

## M4 — Verify & ship — `pending`
Live test matrix (group mention, private, memory recall, /reset), clean-code-guard pass on the
full diff, README (local run + Render deploy), final commit.
**Accept:** README accurate, guard line `clean-code-guard: clean` recorded, all commits pushed
(if remote exists) and worklog handoff written.
