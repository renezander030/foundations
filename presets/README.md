# Presets — real-wiring source blocks

Drop-in source definitions for `foundations.config.json`. Each `*.json` here is a
single object you can paste into your config's `sources` array (or, for `proven`,
merge into the top-level `proven` block). Everything is generic: **edit the paths
and command names to match your machine** before relying on it.

The fastest path is `foundations init` — it detects which of these tools/dirs
actually exist on your machine and writes only the working ones (no broken roots,
no dead commands). These files are for wiring things `init` doesn't know about, or
for understanding exactly what `init` generated.

| Preset | Type | What it wires | Detected by `init` via |
|--------|------|---------------|------------------------|
| `ats.json` | command | a task/issue CLI that emits a JSON array (e.g. `ats find … --json`) | `ats` on `PATH` |
| `rzq.json` | command | a content/semantic-search CLI (e.g. `rzq semantic …`) | `rzq` on `PATH` |
| `memory.json` | files | agent/personal memory notes (Codex/Claude memory dirs) | `~/.codex/memory`, `~/.claude/memory` |
| `repos.json` | files | your local source checkouts | `~/repos`, `~/code`, `~/src`, `~/projects` |

## Trust classes, on purpose

- `command` sources are `claim`/`published` — the tool *says* it's relevant; nobody
  verified it. They are leads.
- `files` sources are `note`/`code` — present and readable, not confirmed to
  run/work.
- Only the `proven` tier (installed CLIs that actually run, exit 0) is build-on-it.

To make a lead one step from proof, add a `validate` block to its source — see
the comment in each preset and `foundations prove --help`.
