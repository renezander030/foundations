import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { makeFixture } from "./helpers/make-fixture.mjs";
import { spawnCli } from "./helpers/spawn-cli.mjs";

describe("verdicts", () => {
  it("returns no-local-coverage when no local hits exist", () => {
    const fix = makeFixture({
      "foundations.config.json": JSON.stringify({
        sources: [],
        external: [],
      }),
    });

    const result = spawnCli(["check", "vector search"], {
      FOUNDATIONS_CONFIG: path.join(fix.path, "foundations.config.json"),
    });
    assert.equal(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.equal(data.verdict, "no-local-coverage");
  });

  it("returns unverified-leads-only when unverified hits exist", () => {
    const fix = makeFixture({
      "notes/vector.md": "vector search caching deployment guide",

      "foundations.config.json": JSON.stringify({
        sources: [
          {
            name: "notes",
            type: "files",
            kind: "note",
            roots: ["./notes"],
            exts: [".md"],
          },
        ],
        external: [],
      }),
    });

    const result = spawnCli(["check", "vector search"], {
      FOUNDATIONS_CONFIG: path.join(fix.path, "foundations.config.json"),
    });
    assert.equal(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.equal(data.verdict, "unverified-leads-only");
    assert.ok(data.unverified.notes.length > 0);
  });

  it("returns proven-tooling-exists when a matching proven tool exists", () => {
    const fix = makeFixture({
      "bin/vector-search": `#!/usr/bin/env node
process.exit(0);
`,
    });

    const toolPath = path.join(fix.path, "bin", "vector-search");
    fs.chmodSync(toolPath, 0o755);
    const config = {
      proven: {
        bin: "./bin",
        liveness: ["help"],
      },
      sources: [],
      external: [],
    };
    fs.writeFileSync(
      path.join(fix.path, "foundations.config.json"),
      JSON.stringify(config),
    );

    const result = spawnCli(["check", "vector search"], {
      FOUNDATIONS_CONFIG: path.join(fix.path, "foundations.config.json"),
    });
    assert.equal(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.equal(data.verdict, "proven-tooling-exists");
    assert.equal(data.proven.length, 1);
    assert.equal(data.proven[0].trust, "proven");
  });
});
