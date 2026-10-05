---
name: deslop-docs
description: >-
  Rewrites documentation and code comments to remove AI-generated filler
  ("slop"): hype words, restated code, redundant headers, emoji bullets, and
  hedging. Use when the user asks to de-slop, tighten, clean up, or make docs,
  READMEs, AGENTS.md, docstrings, or inline comments less verbose or less
  "AI-sounding".
---

# De-slop Docs and Comments

Goal: every sentence should tell the reader something they can't get faster
from the code or the filename. Keep facts, drop noise. Never change behavior.

## Steps

1. **Scope.** Use the files the user named. If none, ask, or default to
   `README.md`, `AGENTS.md`, and changed files (`git diff --name-only`).
2. **Scan.** Run the detector to get a starting list (it's a hint, not a
   verdict — it misses structural slop and flags some legit uses):
   ```bash
   python3 .agents/skills/deslop-docs/scripts/find_slop.py <paths...>
   ```
3. **Rewrite** each file using the rules below. Read the surrounding code
   before touching a comment so you don't delete the one line that explains
   a non-obvious *why*.
4. **Verify.**
   - Re-run the detector; remaining hits must be deliberate.
   - `git diff --stat` — docs should shrink or stay flat, rarely grow.
   - Check no commands, paths, versions, node names, or invariants were lost
     (diff every removed line that contains a backtick or number).
   - If code files were touched, run the project's type check / tests
     (here: `cd game && npx tsc --noEmit && npm test`).
5. **Report** briefly: files changed, line delta, anything you weren't sure
   about deleting.

## Rules: prose (Markdown docs)

- **Delete hype and filler**: comprehensive, robust, seamless, powerful,
  cutting-edge, leverage, utilize, elevate, delve, crucial, vital, "it's worth
  noting", "in order to", "simply", "easily", "effortlessly", "best-in-class".
- **Delete throat-clearing intros and recap outros**: "This document outlines…",
  "In this section we will…", "In summary…", "By following these guidelines…".
  Start with the first fact.
- **Cut the restatement.** If a heading says "Installation", don't open with
  "To install the project, follow these steps".
- **Flatten structure.** No heading for a single bullet. No bullet list for one
  item. Drop horizontal rules between every section. Max ~3 heading levels.
- **No decorative emoji** in headings or bullets. No bold on every other phrase;
  bold only the one thing a skimmer must not miss.
- **Prefer tables/commands over sentences** when the content is a lookup.
- **Concrete over abstract**: replace "handles various edge cases" with the
  actual cases, or delete it.
- **Don't hedge facts you know** ("should generally", "may potentially"). State
  it, or state the actual condition.
- Keep the author's voice and any project-specific terminology.

## Rules: code comments and docstrings

- **Delete comments that restate the code**: `// increment i`, `# Import
  modules`, `// Constructor`, `/** Gets the name. @returns the name */`.
- **Keep and sharpen *why* comments**: invariants, workarounds, units,
  coordinate systems, links to issues/specs, surprising performance choices.
- **Delete changelog comments** ("Updated to use X", "New: …", "Fixed bug
  where…") — that's what git is for.
- **Delete section-banner comments** (`// ===== Helpers =====`) unless the file
  is long and they're the only navigation.
- **Docstrings**: one-line summary in imperative mood; document params/returns
  only when types and names don't already say it. Drop `@param x - The x.`
- **Never delete**: license headers, lint/type directives (`// @ts-expect-error`,
  `# noqa`, `eslint-disable`), `TODO`/`FIXME` with real content, doc comments
  that feed generated API docs.
- Comment edits only — do not rename, reformat, or refactor code in the same pass.

## Example

Before:
```ts
// 🚀 This function is responsible for seamlessly calculating the shortest
// path. It leverages a robust BFS algorithm to efficiently handle all cases.
// Returns: the shortest path length
function shortestPath(state: GameState, player: number): number {
```

After:
```ts
// BFS over tiles; walls block edges, pawns don't. Returns -1 if no path.
function shortestPath(state: GameState, player: number): number {
```
