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
- `context/Feature/01-workspace-shell-and-layout.md` — Unit 01 spec
- `context/Feature/02-note-crud-and-storage.md` — Unit 02 spec
- `context/Feature/03-markdown-editor-and-preview.md` — Unit 03 spec
- `context/Feature/04-folders-tags-and-search.md` — Unit 04 spec
- `context/Feature/05-ai-note-assistant.md` — Unit 05 spec
- `context/Feature/06-export-and-sharing.md` — Unit 06 spec

Update `context/progress-tracker.md` after every meaningful implementation change.
If implementation changes architecture, scope, or standards documented in context files, update the relevant file before continuing.
