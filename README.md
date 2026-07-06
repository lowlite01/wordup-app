# WordUp

A full-stack app for learning English vocabulary — flashcards, quizzes, pronunciation and speaking practice, word context (phrasal verbs, collocations, synonyms), gamification and a leaderboard.

## Features

- **Vocabulary by CEFR level (A1–C2) and topic**, with per-level unlocking.
- **Flashcards** with flip animation, spaced review of unknown words, and progress tracking.
- **Quizzes** with mistake statistics ("which words you confuse").
- **Pronunciation**: IPA transcription and audio (Free Dictionary API) with browser text-to-speech fallback.
- **Speaking practice** via the Web Speech API — say the word, the app checks you.
- **Word context** from the Datamuse API: phrasal verbs, collocations and synonyms.
- **YouGlish links** for real-world usage in YouTube videos.
- **Gamification**: XP, levels, daily streak, achievements and a global leaderboard.
- **Google sign-in** with avatar; progress syncs to the server across devices.
- **3 themes** and **English / Russian** interface, chosen in settings.

## Tech stack

| Layer | Tech |
|---|---|
| Web | React 18, Vite, TypeScript |
| API | NestJS, Prisma |
| Database | PostgreSQL (Neon) |
| Auth | Google OAuth (ID token) + JWT |

## Structure

Monorepo (npm workspaces):

```
apps/
  web/   React + Vite + TypeScript web app
  api/   NestJS API + Prisma + PostgreSQL
```

## Getting started

```bash
npm install                      # once, from the repo root

# API — copy apps/api/.env.example to apps/api/.env and fill in DATABASE_URL etc.
npm --prefix apps/api run prisma:migrate
npm --prefix apps/api run dev    # http://localhost:3000/api

# Web — copy apps/web/.env.example to apps/web/.env
npm --prefix apps/web run dev    # http://localhost:5175
```

The web app works offline (localStorage) without the API; signing in with Google
enables cross-device sync and gamification.

## Roadmap

1. [x] React web app (3 themes, EN/RU, settings)
2. [x] NestJS API + PostgreSQL (Prisma)
3. [x] Google sign-in with avatar, server-side progress
4. [x] Gamification: streak, XP & levels, achievements, leaderboard
5. [ ] Admin panel for words/topics
6. [ ] Expo React Native app (Android/iOS)
7. [ ] Deploy (web + API)

## License

MIT — see [LICENSE](LICENSE).
