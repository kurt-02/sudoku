# Sudoku

A Sudoku web app built with Next.js (App Router), TypeScript, and Tailwind CSS. Planned features
include a pure game engine, an interactive board, Google sign-in, and saved progress.

## Setup

Requires Node.js 22+ (developed on Node 24).

```bash
npm install
cp .env.example .env.local   # not needed until Phase 4
npm run dev                  # http://localhost:3000
```

## Scripts

| Script                 | What it does                     |
| ---------------------- | -------------------------------- |
| `npm run dev`          | Start the dev server (Turbopack) |
| `npm run build`        | Production build                 |
| `npm run start`        | Serve the production build       |
| `npm run lint`         | Run ESLint                       |
| `npm run typecheck`    | Type-check with `tsc --noEmit`   |
| `npm run test`         | Run Vitest once                  |
| `npm run test:watch`   | Run Vitest in watch mode         |
| `npm run format`       | Format all files with Prettier   |
| `npm run format:check` | Check formatting without writing |

## Project structure

```
src/
  app/             routes
  components/      shared UI
  components/ui/   primitives
  lib/             utilities
  lib/sudoku/      pure game engine
  types/           shared TypeScript types
```

## Roadmap

- [x] Phase 0: Foundation (scaffold, tooling, tests, CI-ready scripts)
- [ ] Phase 1: Engine (pure puzzle generation, validation, solving)
- [ ] Phase 2: Board (interactive grid UI)
- [ ] Phase 3: Game feel (notes, undo, timer, keyboard, polish)
- [ ] Phase 4: Database
- [ ] Phase 5: Google auth
- [ ] Phase 6: Persistence (save and resume games per user)
