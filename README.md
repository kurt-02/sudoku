# Sudoku

A Sudoku web app built with Next.js (App Router), TypeScript, and Tailwind CSS. Planned features
include a pure game engine, an interactive board, Google sign-in, and saved progress.

## Setup

Requires Node.js 22+ (developed on Node 24).

```bash
npm install
cp .env.example .env.local   # then fill in the Google auth values
npm run dev                  # http://localhost:3000
```

## Scripts

| Script                 | What it does                                |
| ---------------------- | ------------------------------------------- |
| `npm run dev`          | Start the dev server (Turbopack)            |
| `npm run build`        | Production build                            |
| `npm run start`        | Serve the production build                  |
| `npm run lint`         | Run ESLint                                  |
| `npm run typecheck`    | Type-check with `tsc --noEmit`              |
| `npm run test`         | Run Vitest once                             |
| `npm run test:watch`   | Run Vitest in watch mode                    |
| `npm run format`       | Format all files with Prettier              |
| `npm run format:check` | Check formatting without writing            |
| `npm run db:generate`  | Create a migration from `src/db/schema.ts`  |
| `npm run db:migrate`   | Apply migrations to `DATABASE_URL_UNPOOLED` |
| `npm run db:studio`    | Browse the database in Drizzle Studio       |

Database tests run against the real `DATABASE_URL` and are skipped unless you opt in:
`RUN_DB_TESTS=1 npm test` (they create and delete a throwaway test player).

## Project structure

```
src/
  app/             routes
  components/      shared UI
  components/ui/   primitives
  lib/             utilities
  lib/sudoku/      pure game engine
  db/              database schema and queries (Drizzle + Postgres)
  types/           shared TypeScript types
```

## Roadmap

- [x] Phase 0: Foundation (scaffold, tooling, tests, CI-ready scripts)
- [x] Phase 1: Engine (pure puzzle generation, validation, solving)
- [x] Phase 2: Board (interactive grid UI)
- [x] Phase 3: Game feel (notes, undo, timer, keyboard, polish)
- [ ] Phase 4: Database
- [x] Phase 5: Google auth
- [ ] Phase 6: Persistence (save and resume games per user)
