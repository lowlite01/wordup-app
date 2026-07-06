# WordUp

Learn-English vocabulary app: flashcards, quizzes, pronunciation, speaking practice and word context.

## Structure

Monorepo (npm workspaces):

```
apps/
  web/      React + Vite + TypeScript web app
  api/      (planned) NestJS backend + PostgreSQL
  mobile/   (planned) Expo React Native app
packages/
  shared/   (planned) shared types & logic
```

## Run the web app

```
npm install        # once, from the repo root
npm --prefix apps/web run dev
```

Open http://localhost:5175

## Roadmap

1. [x] React web app (3 switchable themes, settings screen)
2. [ ] NestJS API + PostgreSQL
3. [ ] Google sign-in (avatar), server-side progress
4. [ ] Gamification: streak, XP & levels, achievements, leaderboard
5. [ ] Admin panel for words/topics
6. [ ] Expo React Native app (Android/iOS)
7. [ ] Deploy (web + API)
