import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { makeFixture } from "./helpers/make-fixture.mjs";
import { spawnCli } from "./helpers/spawn-cli.mjs";

// Issue #1 — `foundations doctor`: is each configured source actually usable?
// Exits 0 when all sources are usable, non-zero when any is not.
function writeCfg(fix, config) {
  const p = path.join(fix.path, "foundations.config.json");
  fs.writeFileSync(p, JSON.stringify(config));
  return p;
}
function makeBin(fix) {
  const binDir = path.join(fix.path, "bin");
  fs.mkdirSync(binDir, { recursive: true });
  const tool = path.join(binDir, "mytool");
  fs.writeFileSync(tool, "#!/bin/sh\nexit 0\n");
  fs.chmodSync(tool, 0o755);
  return binDir;
}

describe("doctor", () => {
  it("healthy config exits 0 with ok:true", () => {
    const fix = makeFixture({ "notes/a.md": "vector search" });
    try {
      const conf = writeCfg(fix, {
        proven: { bin: makeBin(fix), liveness: ["help"] },
        sources: [{ name: "notes", type: "files", roots: ["./notes"], exts: [".md"] }],
      });
      const r = spawnCli(["doctor"], { FOUNDATIONS_CONFIG: conf });
      assert.equal(r.status, 0);
      const data = JSON.parse(r.stdout);
      assert.equal(data.ok, true);
      assert.ok(data.sources.every((s) => s.ok));
    } finally { fix.cleanup(); }
  });

  it("missing command source makes doctor exit non-zero", () => {
    const fix = makeFixture({});
    try {
      const conf = writeCfg(fix, {
        proven: { bin: makeBin(fix) },
        sources: [{ name: "tasks", type: "command", search: { cmd: "this-command-does-not-exist-xyz" }, map: { id: "id" } }],
      });
      const r = spawnCli(["doctor"], { FOUNDATIONS_CONFIG: conf });
      assert.notEqual(r.status, 0);
      const data = JSON.parse(r.stdout);
      assert.equal(data.ok, false);
      assert.ok(data.sources.find((s) => s.name === "tasks" && s.ok === false));
    } finally { fix.cleanup(); }
  });

  it("invalid JSON command source makes doctor exit non-zero", () => {
    const fix = makeFixture({});
    try {
      const conf = writeCfg(fix, {
        proven: { bin: makeBin(fix) },
        sources: [{ name: "tasks", type: "command", search: { cmd: "echo", args: ["nope"] }, map: { id: "id" } }],
      });
      const r = spawnCli(["doctor"], { FOUNDATIONS_CONFIG: conf });
      assert.notEqual(r.status, 0);
      assert.ok(JSON.parse(r.stdout).errors.some((e) => /not valid JSON/.test(e)));
    } finally { fix.cleanup(); }
  });

  it("missing file root makes doctor exit non-zero", () => {
    const fix = makeFixture({});
    try {
      const conf = writeCfg(fix, {
        proven: { bin: makeBin(fix) },
        sources: [{ name: "repos", type: "files", roots: ["/missing/repos"], exts: [".js"] }],
      });
      const r = spawnCli(["doctor"], { FOUNDATIONS_CONFIG: conf });
      assert.notEqual(r.status, 0);
      assert.ok(JSON.parse(r.stdout).sources.find((s) => s.name === "repos" && s.ok === false));
    } finally { fix.cleanup(); }
  });

  it("missing proven bin is reported without a raw stack trace", () => {
    const fix = makeFixture({ "notes/a.md": "x" });
    try {
      const conf = writeCfg(fix, {
        proven: { bin: "/nonexistent/bin/dir", liveness: ["help"] },
        sources: [{ name: "notes", type: "files", roots: ["./notes"], exts: [".md"] }],
      });
      const r = spawnCli(["doctor"], { FOUNDATIONS_CONFIG: conf });
      assert.notEqual(r.status, 0);
      assert.equal(JSON.parse(r.stdout).proven.ok, false);
      assert.ok(!/\bat .*\(.*:\d+:\d+\)/.test(r.stderr), "no V8 stack frames on stderr");
    } finally { fix.cleanup(); }
  });
});
