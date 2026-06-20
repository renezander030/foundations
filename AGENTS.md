# Using `foundations` from an AI agent

The core rule, in one line:

> **Before any broad web search, MCP call, or repo-wide grep, run `foundations check "<the idea>"` and build on what it finds — in trust order.**

`foundations` exists because agents reach for a stranger's best practice before
the fix you already proved works. This guide makes the agent check your own
network first. Copy the relevant block into your agent's instruction file.

## When to run it

Run `foundations check "<idea>"` **first** whenever you are about to:

- research how to do something ("how do I cache vector search results?"),
- pick a library, tool, or approach,
- start designing or building something new,
- reach for WebSearch / WebFetch / an MCP tool / a package registry.

Do **not** run it for trivial, fully-specified mechanical steps (rename a var,
fix a typo). It is a pre-*research* gate, not a pre-*edit* gate.

## How to read the output

`foundations check` returns JSON by default (add `--human` for a report). Three
trust tiers, and your next move depends only on which one has hits:

- **proven** — an installed CLI that *actually ran* (liveness-checked, exit 0).
  **Build on it. Do not reinvent it.** This is the answer; use the tool.
- **unverified** — found in your network but NOT validated: tasks/issues
  (`claim`), notes (`note`), code (`code`), published content (`published`).
  **Treat as leads.** Validate exactly one before relying on it — run
  `foundations prove <source>:<item>`, or run/test the thing it describes. A lead
  is not an answer.
- **external** — web / MCP / package registries. **Untrusted until you validate
  it.** Only escalate here after the local sweep, and label whatever you find
  untrusted until you have proven it in this environment.

The top-level `verdict` summarizes it:

- `proven-tooling-exists` → use the proven tool; do not search the web.
- `unverified-leads-only` → validate a lead first (`foundations prove …`); escalate
  to external only if the leads don't pan out.
- `no-local-coverage` → clear to escalate to external sources; treat results as
  untrusted until validated in this environment.

`score_explanation` on every result tells you *why* it ranked where it did
(matched terms, filename matches, recency), so you can judge a lead without
reverse-engineering the ranking.

**Before trusting a `no-local-coverage` verdict, check it's real.** The
`diagnostics` block in `check` output (and `foundations doctor`) tells you whether
a source returned nothing because there genuinely is nothing, or because it's
broken (command missing, file root gone, bad JSON). A source with
`status: "error"` means the sweep is degraded — fix it (or run `foundations
doctor`) before concluding the web is your only option.

## When external escalation is allowed

Escalate to the web / MCP / registries **only** when the local sweep gives you
`no-local-coverage`, or when every unverified lead has been checked and rejected.
Even then, what you bring back is `untrusted` until you validate it here.

## Setup (once)

```sh
npm install -g foundations-cli      # or clone + ln -s bin/foundations
foundations init                    # detects your tools/dirs, writes the config
```

`init` writes to `$XDG_CONFIG_HOME/foundations/config.json` (default
`~/.config/foundations/config.json`) and `foundations check` picks it up
automatically. See `presets/` to wire more tools.

---

## Copy-paste blocks

### Codex / Claude — paste into `AGENTS.md`, `CLAUDE.md`, or system prompt

```md
## Check your own network before searching

Before researching anything, picking a library/tool, or calling
WebSearch/WebFetch/an MCP tool, FIRST run:

    foundations check "<the idea in a few words>" --human

- proven   → an installed tool that ran cleanly. Build on it; do not reinvent.
- unverified → leads (tasks/notes/code), NOT validated. Validate one first:
    foundations prove <source>:<item>
- external → web/MCP. Untrusted. Escalate ONLY when foundations reports
    no-local-coverage (or every lead failed validation).

Never blur "proven" with "read it somewhere". The web is the last door, not the first.
```

### Cursor — paste into `.cursor/rules` (or a `.mdc` rule file)

```md
---
description: Check the user's own network before external research
alwaysApply: true
---
Before researching, choosing a tool/library, or doing any web/MCP lookup, run
`foundations check "<idea>"` in the terminal and prefer its results in trust
order: proven (build on it) > unverified leads (validate with
`foundations prove <source>:<item>` first) > external (untrusted, last resort).
Only go external when foundations reports `no-local-coverage`.
```

### Any agent with shell access — minimal rule

```
Pre-search hook: run `foundations check "<idea>"` before any web/MCP/registry
lookup. Build on `proven`; validate `unverified` with `foundations prove`; go
`external` only on `no-local-coverage`.
```
