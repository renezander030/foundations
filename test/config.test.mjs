import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { makeFixture } from "./helpers/make-fixture.mjs";
import { spawnCli } from "./helpers/spawn-cli.mjs";

describe("config", () => {
  it("relative paths resolve from config directory", () => {
    const fix = makeFixture({
      "nested/notes/vector.md": "vector search",
      "nested/foundations.config.json": JSON.stringify({
        sources: [
          {
            name: "notes",
            type: "files",
            roots: ["./notes"],
            exts: [".md"],
          },
        ],
      }),
    });

    try {
      const result = spawnCli(["check", "vector search"], {
        FOUNDATIONS_CONFIG: path.join(
          fix.path,
          "nested",
          "foundations.config.json",
        ),
      });

      assert.equal(result.status, 0);
      const data = JSON.parse(result.stdout);
      assert.ok(data.unverified.notes.length > 0);
    } finally {
      fix.cleanup();
    }
  });

  it("FOUNDATIONS_CONFIG overrides default config", () => {
    const fix = makeFixture({
      "notes/vector.md": "vector search",
      "foundations.config.json": JSON.stringify({
        sources: [
          {
            name: "notes",
            type: "files",
            roots: ["./notes"],
            exts: [".md"],
          },
        ],
      }),
    });

    try {
      const result = spawnCli(["check", "vector search"], {
        FOUNDATIONS_CONFIG: path.join(fix.path, "foundations.config.json"),
      });
      assert.equal(result.status, 0);
      const data = JSON.parse(result.stdout);
      assert.ok(data.unverified.notes.length > 0);
    } finally {
      fix.cleanup();
    }
  });

  it("invalid config exits non-zero", () => {
    const fix = makeFixture({
      "foundations.config.json": "{ definitely invalid json",
    });
    try {
      const result = spawnCli(["check", "vector search"], {
        FOUNDATIONS_CONFIG: path.join(fix.path, "foundations.config.json"),
      });
      assert.notEqual(result.status, 0);
    } finally {
      fix.cleanup();
    }
  });

  it("missing config exits non-zero", () => {
    const result = spawnCli(["check", "vector search"], {
      FOUNDATIONS_CONFIG: "/definitely/does/not/exist.json",
    });
    assert.notEqual(result.status, 0);
  });
});
