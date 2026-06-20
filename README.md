<p align="center">
  <img src="assets/foundations-logo.png" alt="foundations" width="440">
</p>

**Check your own network before you google.**

Your AI agent reaches for a stranger's best practice before it reaches for the
fix you already proved works. Not because the model is bad. Because nothing told
it where to look first.

`foundations` is a small CLI that sweeps *your own* network for an idea and sorts
what it finds by **trust**, so you (and your agent) build on practice, not loose
ends:

- **proven** — an installed CLI that *actually ran* (liveness-checked, exit 0). Build on it.
- **unverified** — found in your network but not validated: tasks/issues (`claim`), notes (`note`), code (`code`). Treat as leads; validate one before relying on it.
- **external** — web / MCP / package registries. Escalate only after the local sweep, and treat as untrusted until you validate it.

The trust order is the whole point. The open web is the last door you knock on,
not the first.

## Quick start

```sh
git clone <this-repo> && cd foundations
node bin/foundations check "vector search caching" --human
```

It works out of the box: the bundled config points at `./demo`, so the sweep has
real things to find (runnable demo CLIs, demo notes, a demo repo).

Put it on your PATH:

```sh
npm install -g .        # exposes `foundations`
# or: ln -s "$PWD/bin/foundations" /usr/local/bin/foundations
foundations "vector search"     # bare idea is shorthand for `check`
```

## What you get

```
IDEA: "vector search caching"
VERDICT: proven-tooling-exists
> You already have PROVEN tooling for this. Build on it; do not reinvent.

PROVEN WORKING (2)
   vecto     — ran 'vecto help' (exit 0)   [re-prove: vecto help]
   cachebox  — ran 'cachebox help' (exit 0)   [re-prove: cachebox help]

UNVERIFIED · tasks [claim] — tasks are intentions you noted, not validated working
   Spike: vector search index for product search (2)  ·T-101

UNVERIFIED · notes [note] — prior knowledge, may be stale; verify before relying
   vector-search.md:1  Note: vector search, the version that actually shipped

UNVERIFIED · repos [code] — source is present, not confirmed to run/work
   .../demo/repos/demo-app/src/search.js

EXTERNAL (escalate only after the above, UNTRUSTED until validated):
   WebSearch / WebFetch  — external; validate before trusting
```

Drop `--human` for JSON (the default), so an agent can consume it.

## Wire it to your own tools

Copy the example config and edit it:

```sh
cp foundations.config.example.json foundations.config.json
# or point anywhere:
export FOUNDATIONS_CONFIG=/path/to/foundations.config.json
```

Two source types, both config-only (no code):

**`command`** — run any CLI that prints a JSON array, then map its fields. This is
how you plug in a task CLI, an issue tracker, or a content search:

```json
{
  "name": "tasks",
  "type": "command",
  "kind": "claim",
  "why": "tasks are intentions you noted, not validated working",
  "search": { "cmd": "your-task-cli", "args": ["search", "{query}", "--json"] },
  "map": { "id": "id", "title": "title", "score": "score", "url": "url" }
}
```

`{query}` is replaced with the idea, `{k}` with the result limit. `map` reads
dotted paths (e.g. `"data.title"`).

**`files`** — a bounded, pure-Node text search over local roots (no `grep`/`rg`
dependency):

```json
{
  "name": "notes",
  "type": "files",
  "kind": "note",
  "why": "prior knowledge, may be stale; verify before relying",
  "roots": ["/path/to/your/notes"],
  "exts": [".md", ".txt"]
}
```

**`proven`** — point `bin` at your CLI install dir. Each candidate whose name,
target, or header matches the idea is *run* (`help` / `--help`); only the ones
that exit 0 are reported as proven.

```json
{ "proven": { "bin": "/usr/local/bin", "liveness": ["help", "--help", "version"] } }
```

See `foundations.config.example.json` for the full shape.

## Why trust order, not just search

Recommending a best practice is a graph problem: trust proximity, not text
similarity. What ran and worked in your environment beats what you wrote down;
what you wrote down beats what a teammate remembers; that beats the top search
result. `foundations` makes that order explicit and refuses to blur "proven" with
"read it somewhere once".

## Set it up in one command

```sh
foundations init
```

`init` detects your CLI install dir and which tools/dirs actually exist on this
machine, then writes a ready-to-use config to
`$XDG_CONFIG_HOME/foundations/config.json` (default
`~/.config/foundations/config.json`) — with **absolute paths**, and **only**
sources whose backing tool or directory is really present (no broken roots, no
dead commands). `foundations check` picks that config up automatically.

```sh
foundations init --print            # preview the config, write nothing
foundations init --force            # overwrite an existing config
foundations init --config ./fdn.json
```

It knows a few presets out of the box — `ats` and `rzq` (command sources, detected
on `PATH`), Codex/Claude **memory** dirs and your **repos** dir (files sources,
detected by location). Anything not found is skipped, not written. Wire more by
copying blocks from [`presets/`](presets/).

## Prove a lead

The product is strict on purpose: an unverified lead is not an answer. `prove`
takes you from a hit to a concrete proof, without silently promoting weak
evidence:

```sh
foundations prove proven:vecto          # re-run the tool's liveness check
foundations prove notes:vector-search.md  # inspect the file (read != ran → stays unverified)
foundations prove tasks:T-101           # run the source's `validate` command, if configured
```

Only an actual clean **execution** — a tool that runs (exit 0), or a source's
configured `validate` command exiting 0 — yields `proven`. Inspecting a file or a
claim with no validation stays `unverified`, and says so.

## Why each result ranked where it did

Every result carries its reasoning so a JSON consumer (or you) never has to
reverse-engineer the score:

```json
{
  "file": ".../notes/vector-search.md", "score": 4.5,
  "matched_terms": ["vector", "search"],
  "filename_matches": ["vector", "search"],
  "recency_days": 12,
  "score_explanation": "2 content terms (vector, search) + 2 filename matches×2 (vector, search) + recent +0.5 (12d old)"
}
```

File ranking is distinct content terms + filename matches (weighted ×2, a strong
intent signal) + a small recency boost. `--human` prints the `why ranked:` line
under each hit.

## Use it from an AI agent

The whole point is to make your agent check your network before it googles. See
[`AGENTS.md`](AGENTS.md) for copy-paste rules for Codex, Claude, and Cursor — the
short version: run `foundations check "<idea>"` before any web/MCP/registry
lookup, build on `proven`, validate `unverified` with `foundations prove`, and go
`external` only on `no-local-coverage`.

## Is the sweep working, or is there just nothing there?

A configured source can silently return nothing because a command is missing, a
file root doesn't exist, JSON failed to parse, or a scan hit its limit — which
looks identical to "no local coverage". Two things fix that:

`foundations check` now carries per-source **diagnostics** (JSON `diagnostics` key;
a footer in `--human`), so a broken source never reads as an empty one:

```text
Diagnostics (run `foundations doctor` for detail):
   ERROR tasks: command not found: your-task-cli
   WARN  notes: root does not exist: /path/to/notes
```

`foundations doctor` is the dedicated health check — it exits non-zero if any
configured source is unusable, so it works as a CI / pre-flight gate:

```text
foundations doctor
config: /path/to/foundations.config.json

OK      proven  /usr/local/bin       42 candidates, liveness 8/8
OK      tasks   /usr/local/bin/ats   valid JSON array (5 rows)
WARN    notes   /home/you/notes      0 files scanned, 0 matched
FAIL    repos   /missing/repos       root does not exist

Result: FAIL (1 failing source)
```

## Commands

```
foundations check "<idea>" [-k N] [--source <names>]   sweep, sorted by trust
foundations "<idea>"                                    shorthand for check
foundations init [--print] [--force] [--config <path>]  generate a real config
foundations prove <source>:<item>                       turn a lead into a proof
foundations doctor                                      health-check every source
foundations sources                                     what gets swept, and its trust class
foundations help

-H, --human     readable report (default output is JSON)
--source a,b    restrict to named sources (e.g. proven,notes)
```

## Design

- Zero runtime dependencies (Node ≥ 18, ESM). `lib/foundation.js` is a small,
  self-contained CLI scaffold (arg parsing, JSON/`--human` output, subcommand
  router).
- Bounded file search (size + scan caps, skips `node_modules`/`.git`/etc.) so a
  sweep stays fast on a large tree.
- JSON by default; `--human` for a report.

## License

MIT © Rene Zander
