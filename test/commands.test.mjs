import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { makeFixture } from "./helpers/make-fixture.mjs";
import { spawnCli } from "./helpers/spawn-cli.mjs";

// Items 5 & 8 — init (config generation) and prove (lead -> proof, strict).
function writeCfg(fix, config) {
  const p = path.join(fix.path, "foundations.config.json");
  fs.writeFileSync(p, JSON.stringify(config));
  return p;
}

describe("init", () => {
  it("--print emits a valid config and writes nothing", () => {
    const fix = makeFixture({});
    try {
      const conf = writeCfg(fix, { sources: [] });
      const r = spawnCli(["init", "--print"], { FOUNDATIONS_CONFIG: conf });
      assert.equal(r.status, 0);
      const data = JSON.parse(r.stdout);
      assert.ok(data.proven && data.proven.bin, "generated config has proven.bin");
      assert.ok(Array.isArray(data.sources));
    } finally { fix.cleanup(); }
  });

  it("writes to --config and refuses to overwrite without --force", () => {
    const fix = makeFixture({});
    try {
      const conf = writeCfg(fix, { sources: [] });
      const target = path.join(fix.path, "generated.json");
      const first = spawnCli(["init", "--config", target], { FOUNDATIONS_CONFIG: conf });
      assert.equal(first.status, 0);
      assert.ok(fs.existsSync(target));
      const second = spawnCli(["init", "--config", target], { FOUNDATIONS_CONFIG: conf });
      assert.notEqual(second.status, 0, "must refuse to clobber without --force");
      const forced = spawnCli(["init", "--config", target, "--force"], { FOUNDATIONS_CONFIG: conf });
      assert.equal(forced.status, 0);
    } finally { fix.cleanup(); }
  });
});

describe("prove", () => {
  it("a tool that runs cleanly is promoted to proven", () => {
    const fix = makeFixture({});
    try {
      const binDir = path.join(fix.path, "bin");
      fs.mkdirSync(binDir, { recursive: true });
      const tool = path.join(binDir, "mytool");
      fs.writeFileSync(tool, "#!/bin/sh\nexit 0\n");
      fs.chmodSync(tool, 0o755);
      const conf = writeCfg(fix, { proven: { bin: binDir, liveness: ["help"] }, sources: [] });
      const r = spawnCli(["prove", "proven:mytool"], { FOUNDATIONS_CONFIG: conf });
      const data = JSON.parse(r.stdout);
      assert.equal(data.trust, "proven");
      assert.equal(data.exit_status, 0);
    } finally { fix.cleanup(); }
  });

  it("inspecting a file is not enough to promote it (stays unverified)", () => {
    const fix = makeFixture({ "notes/vector.md": "vector search note" });
    try {
      const conf = writeCfg(fix, {
        sources: [{ name: "notes", type: "files", roots: ["./notes"], exts: [".md"] }],
      });
      const r = spawnCli(["prove", "notes:vector.md"], { FOUNDATIONS_CONFIG: conf });
      const data = JSON.parse(r.stdout);
      assert.equal(data.trust, "unverified");
      assert.equal(data.method, "inspect");
    } finally { fix.cleanup(); }
  });

  it("a source's validate command promotes only on exit 0", () => {
    const fix = makeFixture({});
    try {
      const conf = writeCfg(fix, {
        sources: [
          { name: "good", type: "command", search: { cmd: "echo", args: ["[]"] }, map: { id: "id" }, validate: { cmd: "true", args: ["{id}"] } },
          { name: "bad", type: "command", search: { cmd: "echo", args: ["[]"] }, map: { id: "id" }, validate: { cmd: "false", args: ["{id}"] } },
        ],
      });
      const ok = JSON.parse(spawnCli(["prove", "good:X"], { FOUNDATIONS_CONFIG: conf }).stdout);
      const no = JSON.parse(spawnCli(["prove", "bad:X"], { FOUNDATIONS_CONFIG: conf }).stdout);
      assert.equal(ok.trust, "proven");
      assert.equal(no.trust, "unverified");
    } finally { fix.cleanup(); }
  });
});
