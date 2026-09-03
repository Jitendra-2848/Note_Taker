# AI Workflow Rules — Note Taker

## Approach

Development for Note Taker follows an **incremental, spec-driven workflow**. The context files in `context/` define the product goals, architectural boundaries, code standards, and visual design system. Feature unit specifications in `context/Feature/` break down the implementation into discrete, verifiable units.

Coding agents MUST read and follow these context documents and feature specs. Do not guess behavior, invent unapproved features, or drift from established standards.

## Scoping Rules

1. **One Unit at a Time**: Work on exactly one feature spec unit at a time. Finish and verify the unit completely before moving to the next.
2. **No Speculative Coding**: Do not implement unrequested features, future hooks, or speculative helper modules not required by the active unit spec.
3. **Boundary Discipline**: Keep changes strictly within the system boundaries specified in the active unit. Do not refactor unrelated modules while working on a feature.

## When to Split Work

If an implementation step involves any of the following, SPLIT the step into smaller sub-units:
- Modifying UI components while simultaneously altering storage models or API routes.
- Writing more than 3 major files in a single execution step.
- Resolving ambiguous product behavior that lacks a specification in context files.

Rule of Thumb: If an edit cannot be built, rendered, and verified in under 2 minutes, the scope is too wide.

## Handling Missing or Ambiguous Requirements

1. **No Guessing**: Never infer business logic, complex data structures, or API payloads without checking authoritative context files.
2. **Context Resolution**: If a requirement is ambiguous, check `context/project-overview.md` and `context/architecture.md` first.
3. **Log Open Questions**: If a requirement remains missing or unclear, document it in `context/progress-tracker.md` under **Open Questions** before proceeding with a reasonable fallback.

## Protected Files

Do not modify or edit the following files without explicit instructions:
- `context/README.md` (The master methodology playbook).
- `package-lock.json` (Do not modify manually; manage packages using `npm`).
- `tsconfig.json` (Core TypeScript configuration).
- Generated Next.js build cache `.next/`.

## Keeping Docs in Sync

Whenever an implementation step legitimately updates any of the following:
- System boundaries or file locations -> Update `context/architecture.md`.
- Code standards or TypeScript guidelines -> Update `context/code-standards.md`.
- Theme tokens or UI patterns -> Update `context/ui-context.md`.
- Completed work or session state -> Update `context/progress-tracker.md`.

## Verification Checklist (Before Completing Any Unit)

Before declaring any unit complete, verify:
- [ ] Current feature unit is fully implemented as specified in its `context/Feature/` spec.
- [ ] Code compiles cleanly with zero TypeScript errors (`npx tsc --noEmit`).
- [ ] No invariant defined in `context/architecture.md` was violated.
- [ ] `context/progress-tracker.md` has been updated with completed details.
- [ ] `npm run build` or `npm run dev` passes cleanly without runtime errors.
