<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Application Building Context

Read the following context files in order before implementing or making any architectural decision:

1. `context/project-overview.md` — product definition, goals, core user flow, features, and scope
2. `context/architecture.md` — system structure, folder boundaries, storage model, auth, and invariants
3. `context/ui-context.md` — visual theme, glassmorphism tokens, typography, component rules, and layout patterns
4. `context/code-standards.md` — Next.js 16 (App Router), React 19, TypeScript, styling, and API route rules
5. `context/ai-workflow-rules.md` — spec-driven workflow, scoping, protected files, and verification checklist
6. `context/progress-tracker.md` — current phase, completed units, open questions, and session notes

Read the feature build plan and unit specs in `context/Feature/` when building:
- `context/Feature/00-build-plan.md` — master build plan and unit breakdown
- `context/Feature/01-database-and-api-foundation.md` — Unit 01 spec
- `context/Feature/02-auth-pages-and-session.md` — Unit 02 spec
- `context/Feature/03-note-creation-and-link-generator.md` — Unit 03 spec
- `context/Feature/04-note-details-and-link-management.md` — Unit 04 spec
- `context/Feature/05-public-share-flow-and-concurrency.md` — Unit 05 spec
- `context/Feature/06-poc-documentation-and-submission.md` — Unit 06 spec

Update `context/progress-tracker.md` after each meaningful implementation change.

