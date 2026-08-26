# WordUp

A full-stack language-learning app with **two courses — English and German** — on both **web and mobile**. Learn vocabulary by CEFR level and topic with flashcards, quizzes, pronunciation and speaking practice, a grammar guide, your own imported word lists, gamification and a leaderboard.

The same NestJS API and PostgreSQL database serve a React web app and an Expo (React Native) mobile app, so words, progress and sign-in are shared across every device.

## Features

**Learning**
- **Two courses — English & German** — chosen on first launch and switchable in settings; each course has its own content, grammar and progress.
- **Vocabulary by CEFR level (A1–C2) and topic** (Food, Travel, Nature, …), with per-level unlocking.
- **Flashcards** with a 3D flip, swipe gestures, spaced review of unknown words and progress tracking.
- **Quizzes** with mistake statistics ("which words you confuse").
- **Grammar guide** tailored per course — English tenses, or German alphabet, articles (der/die/das), word order, question words, verb conjugation and cases.
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
- **Google sign-in** with avatar; progress syncs to the server across web and mobile.

**Polish**
- **4 themes** and a **Russian / English / German** interface, chosen in settings.
- **Admin panel** (role-gated) for managing word groups and entries.

## Tech stack

| Layer | Tech |
|---|---|
| Web | React 18, Vite, TypeScript |
| Mobile | Expo (React Native), TypeScript |
| API | NestJS, Prisma |
| Database | PostgreSQL (Neon) |
| Auth | Google OAuth (ID token) + JWT |
| Hosting | Vercel (web) · Render (API) · Neon (database) |

## Architecture

```
Browser (React)  ┐
                 ├──►  NestJS API (Render)  ──►  PostgreSQL (Neon)
Phone  (Expo)    ┘        JWT auth, rules            words, users, progress
```

The clients never talk to the database directly — they call the API, which
enforces auth and business rules. Content is served per course language from
`GET /content?lang=en|de`; progress, stats and gamification sync when signed in.
Both clients also work offline against local storage and fall back gracefully
when the API is unreachable.

## Structure

Monorepo with npm workspaces:

```
apps/
  web/     React + Vite + TypeScript web app
  api/     NestJS API + Prisma + PostgreSQL
  mobile/  Expo (React Native) app
```

> `apps/mobile` is intentionally **outside** the npm workspaces so its React 19
> stays isolated from the web app's React 18. Install and run it on its own.

## Getting started

```bash
npm install                        # once, from the repo root (web + api)

# API — copy apps/api/.env.example to apps/api/.env and fill in DATABASE_URL etc.
npm --prefix apps/api run prisma:migrate
npm --prefix apps/api run dev      # http://localhost:3000/api

# Web — copy apps/web/.env.example to apps/web/.env
npm --prefix apps/web run dev      # http://localhost:5175

# Mobile (separate install)
cd apps/mobile && npm install
npx expo start                     # open in Expo Go (Expo SDK 54)
```

The web app works offline (localStorage) without the API; signing in with Google
enables cross-device sync and gamification. The mobile app fetches content from
the deployed API, so no word data is bundled in the app.

## Deployment

Everything auto-deploys from `main`:

- **Web** → Vercel (root directory `apps/web`).
- **API** → Render (Blueprint in `render.yaml`); runs `prisma migrate deploy` on start.
- **Database** → Neon (serverless PostgreSQL).

## Roadmap

1. [x] React web app (4 themes, RU/EN/DE, settings)
2. [x] NestJS API + PostgreSQL (Prisma)
3. [x] Google sign-in with avatar, server-side progress
4. [x] Gamification: streak, XP & levels, achievements, leaderboard
5. [x] Admin panel for words/topics
6. [x] Expo React Native app (Android/iOS via Expo Go)
7. [x] Deploy (web + API + database)
8. [x] Crystals economy & topic unlocking, word of the day
9. [x] Second course — German (levels, topics, grammar) + multi-language UI
10. [x] Custom word lists (import / export) and a phrasal verbs section
11. [ ] Standalone store builds (EAS)

## License

MIT — see [LICENSE](LICENSE).
