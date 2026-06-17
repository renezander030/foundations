# foundations

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

## Commands

```
foundations check "<idea>" [-k N] [--source <names>]   sweep, sorted by trust
foundations "<idea>"                                    shorthand for check
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
