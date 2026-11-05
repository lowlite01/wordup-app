# WordUp

A full-stack app for learning **English** vocabulary — on the web and as a **Telegram Mini App**. Learn vocabulary by CEFR level and topic with flashcards, quizzes, pronunciation and speaking practice, a grammar guide, your own imported word lists, gamification and a leaderboard.

A NestJS API with PostgreSQL serves the React web app, which also runs inside Telegram as a Mini App (@WordUpDailyBot) with WordUp Pro paid in Telegram Stars.

## Features

**Learning**
- **Vocabulary by CEFR level (A1–C2) and topic** (Food, Travel, Nature, …), with per-level unlocking.
- **Flashcards** with a 3D flip, swipe gestures, spaced review of unknown words and progress tracking.
- **Quizzes** with mistake statistics ("which words you confuse").
- **Grammar guide** — English tenses and core rules.
- **Phrasal verbs** tab (English) — common phrasal verbs grouped by base verb, browsable and studyable.
- **Your own word lists** — paste or upload a list (plain text or JSON) and study it as flashcards; export any list back out (copy / download / share).
- **Pronunciation**: IPA transcription and audio (Free Dictionary API) with a text-to-speech fallback.
- **Speaking practice** via the Web Speech API — say the word, the app checks you.
- **Word context** (Datamuse API): phrasal verbs, collocations and synonyms for any word.
- **YouGlish links** for real-world usage in YouTube videos.

**Engagement & accounts**
- **Gamification**: XP, levels, a daily streak, achievements and a global leaderboard.
- **Crystals economy**: master decks to earn crystals, spend them to unlock new topics.
- **Word of the day** that rotates daily from the active course.
- **Google sign-in** with avatar; progress syncs to the server across devices.

**Polish**
- **4 themes** and a **Russian / English** interface, chosen in settings.
- **Admin panel** (role-gated) for managing word groups and entries.

## Tech stack

| Layer | Tech |
|---|---|
| Web | React 18, Vite, TypeScript |
| Telegram | Mini App + Bot API (Stars payments) |
| API | NestJS, Prisma |
| Database | PostgreSQL (Neon) |
| Auth | Google OAuth (ID token) + JWT |
| Hosting | Vercel (web) · Render (API) · Neon (database) |

## Architecture

```
Browser / Telegram Mini App (React)  ──►  NestJS API (Render)  ──►  PostgreSQL (Neon)
                                            JWT / Telegram auth          words, users, progress
```

The app never talks to the database directly — it calls the API, which
enforces auth and business rules. Content is served from `GET /content`;
progress, stats and gamification sync when signed in. The app also works
offline against local storage and falls back gracefully when the API is
unreachable.

## Structure

Monorepo with npm workspaces:

```
apps/
  web/     React + Vite + TypeScript web app
  api/     NestJS API + Prisma + PostgreSQL
```

## Getting started

```bash
npm install                        # once, from the repo root (web + api)

# API — copy apps/api/.env.example to apps/api/.env and fill in DATABASE_URL etc.
npm --prefix apps/api run prisma:migrate
npm --prefix apps/api run dev      # http://localhost:3000/api

# Web — copy apps/web/.env.example to apps/web/.env
npm --prefix apps/web run dev      # http://localhost:5175
```

The web app works offline (localStorage) without the API; signing in with Google
enables cross-device sync and gamification.

## Deployment

Everything auto-deploys from `main`:

- **Web** → Vercel (root directory `apps/web`).
- **API** → Render (Blueprint in `render.yaml`); runs `prisma migrate deploy` on start.
- **Database** → Neon (serverless PostgreSQL).

## Roadmap

1. [x] React web app (4 themes, RU/EN, settings)
2. [x] NestJS API + PostgreSQL (Prisma)
3. [x] Google sign-in with avatar, server-side progress
4. [x] Gamification: streak, XP & levels, achievements, leaderboard
5. [x] Admin panel for words/topics
6. [x] Telegram Mini App + WordUp Pro (Telegram Stars)
7. [x] Deploy (web + API + database)
8. [x] Crystals economy & topic unlocking, word of the day
9. [x] Russian / English interface
10. [x] Custom word lists (import / export) and a phrasal verbs section

## License

MIT — see [LICENSE](LICENSE).

## Credits

3D icons: [Fluent Emoji](https://github.com/microsoft/fluentui-emoji) by Microsoft (MIT), loaded from jsDelivr.
