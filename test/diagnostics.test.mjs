import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { makeFixture } from "./helpers/make-fixture.mjs";
import { spawnCli } from "./helpers/spawn-cli.mjs";

// Issue #2 — per-source diagnostics in `check`, so a broken source no longer
// reads as an empty one.
function writeCfg(fix, config) {
  const p = path.join(fix.path, "foundations.config.json");
  fs.writeFileSync(p, JSON.stringify(config));
  return p;
}

describe("check diagnostics", () => {
  it("exposes diagnostics.config and per-source diagnostics", () => {
    const fix = makeFixture({ "notes/a.md": "vector search" });
    try {
      const conf = writeCfg(fix, {
        sources: [{ name: "notes", type: "files", roots: ["./notes"], exts: [".md"] }],
      });
      const r = spawnCli(["check", "vector search"], { FOUNDATIONS_CONFIG: conf });
      assert.equal(r.status, 0);
      const d = JSON.parse(r.stdout).diagnostics;
      assert.equal(typeof d.config, "string");
      assert.ok(Array.isArray(d.sources));
      assert.ok(d.sources.every((s) => "status" in s));
    } finally { fix.cleanup(); }
  });

  it("valid command source reports status ok with row count", () => {
    const fix = makeFixture({});
    try {
      const conf = writeCfg(fix, {
        sources: [{
          name: "tasks", type: "command",
          search: { cmd: "echo", args: ['[{"id":"a","title":"hit"}]'] },
          map: { id: "id", title: "title" },
        }],
      });
      const r = spawnCli(["check", "anything"], { FOUNDATIONS_CONFIG: conf });
      const data = JSON.parse(r.stdout);
      const diag = data.diagnostics.sources.find((s) => s.name === "tasks");
      assert.equal(diag.status, "ok");
      assert.equal(diag.rows, 1);
      assert.equal(data.unverified.tasks.length, 1);
    } finally { fix.cleanup(); }
  });

  it("command source exiting non-zero is error, and check still returns", () => {
    const fix = makeFixture({});
    try {
      const conf = writeCfg(fix, {
        sources: [{
          name: "tasks", type: "command",
          search: { cmd: "this-command-does-not-exist-xyz", args: ["{query}"] },
          map: { id: "id" },
        }],
      });
      const r = spawnCli(["check", "anything"], { FOUNDATIONS_CONFIG: conf });
      assert.equal(r.status, 0, "check must not crash on a broken source");
      const diag = r.stdout && JSON.parse(r.stdout).diagnostics.sources.find((s) => s.name === "tasks");
      assert.equal(diag.status, "error");
      assert.ok(diag.errors.some((e) => /not found/.test(e)));
    } finally { fix.cleanup(); }
  });

  it("command source returning invalid JSON is error", () => {
    const fix = makeFixture({});
    try {
      const conf = writeCfg(fix, {
        sources: [{ name: "tasks", type: "command", search: { cmd: "echo", args: ["not json"] }, map: { id: "id" } }],
      });
      const r = spawnCli(["check", "anything"], { FOUNDATIONS_CONFIG: conf });
      const diag = JSON.parse(r.stdout).diagnostics.sources.find((s) => s.name === "tasks");
      assert.equal(diag.status, "error");
      assert.ok(diag.errors.some((e) => /not valid JSON/.test(e)));
    } finally { fix.cleanup(); }
  });

  it("missing file root is not reported as a clean empty source", () => {
    const fix = makeFixture({});
    try {
      const conf = writeCfg(fix, {
        sources: [{ name: "notes", type: "files", roots: ["/nope/does/not/exist"], exts: [".md"] }],
      });
      const r = spawnCli(["check", "anything"], { FOUNDATIONS_CONFIG: conf });
      const diag = JSON.parse(r.stdout).diagnostics.sources.find((s) => s.name === "notes");
      assert.notEqual(diag.status, "ok");
      assert.ok([...diag.warnings, ...diag.errors].some((m) => /does not exist/.test(m)));
    } finally { fix.cleanup(); }
  });

  it("--source filtering marks non-selected sources skipped, never failing", () => {
    const fix = makeFixture({ "notes/a.md": "vector search" });
    try {
      const conf = writeCfg(fix, {
        sources: [
          { name: "notes", type: "files", roots: ["./notes"], exts: [".md"] },
          { name: "tasks", type: "command", search: { cmd: "echo", args: ["[]"] }, map: { id: "id" } },
        ],
      });
      const r = spawnCli(["check", "vector search", "--source", "notes"], { FOUNDATIONS_CONFIG: conf });
      const sources = JSON.parse(r.stdout).diagnostics.sources;
      assert.equal(sources.find((s) => s.name === "tasks").status, "skipped");
      assert.equal(sources.find((s) => s.name === "proven").status, "skipped");
      assert.ok(sources.every((s) => s.status !== "error"));
    } finally { fix.cleanup(); }
  });
});
