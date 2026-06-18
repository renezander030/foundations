import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { makeFixture } from "./helpers/make-fixture.mjs";
import { spawnCli } from "./helpers/spawn-cli.mjs";

describe("sources", () => {
  it("file results expose expected fields", () => {
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

    try {
      const result = spawnCli(["check", "vector search"], {
        FOUNDATIONS_CONFIG: path.join(fix.path, "foundations.config.json"),
      });
      assert.equal(result.status, 0);
      const data = JSON.parse(result.stdout);
      const hit = data.unverified.notes[0];
      assert.ok(hit.file);
      assert.ok(hit.line);
      assert.ok(hit.text);
      assert.equal(typeof hit.score, "number");
      assert.equal(typeof hit.terms, "number");
    } finally {
      fix.cleanup();
    }
  });

  it("--source restricts search to named source", () => {
    const fix = makeFixture({
      "notes/vector.md": "vector search caching",
      "repos/vector.js": "vector search implementation",
      "foundations.config.json": JSON.stringify({
        sources: [
          {
            name: "notes",
            type: "files",
            roots: ["./notes"],
            exts: [".md"],
          },
          {
            name: "repos",
            type: "files",
            roots: ["./repos"],
            exts: [".js"],
          },
        ],
      }),
    });

    try {
      const result = spawnCli(["check", "vector search", "--source", "notes"], {
        FOUNDATIONS_CONFIG: path.join(fix.path, "foundations.config.json"),
      });
      assert.equal(result.status, 0);
      const data = JSON.parse(result.stdout);
      assert.ok(data.unverified.notes.length > 0);
      assert.equal(data.unverified.repos, undefined);
    } finally {
      fix.cleanup();
    }
  });

  it("file source respects configured extensions", () => {
    const fix = makeFixture({
      "notes/match.md": "vector search",
      "notes/match.txt": "vector search",
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
      assert.equal(data.unverified.notes.length, 1);
      assert.match(data.unverified.notes[0].file, /match\.md$/);
    } finally {
      fix.cleanup();
    }
  });

  it("command source maps dotted fields", () => {
    const fix = makeFixture({
      "search.js": `
console.log(JSON.stringify([
  {
    meta: {
      id: "123",
      title: "Vector Search"
    },
    ranking: {
      score: 42
    }
  }
]));
`,
    });

    try {
      const config = {
        sources: [
          {
            name: "tasks",
            type: "command",
            search: {
              cmd: "node",
              args: [path.join(fix.path, "search.js")],
            },
            map: {
              id: "meta.id",
              title: "meta.title",
              score: "ranking.score",
            },
          },
        ],
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
      const hit = data.unverified.tasks[0];
      assert.equal(hit.id, "123");
      assert.equal(hit.title, "Vector Search");
      assert.equal(hit.score, 42);
    } finally {
      fix.cleanup();
    }
  });

  it("command source deduplicates ids", () => {
    const fix = makeFixture({
      "search.js": `
console.log(JSON.stringify([
  {
    id: "1",
    title: "first"
  },
  {
    id: "1",
    title: "duplicate"
  },
  {
    id: "2",
    title: "second"
  }
]));
`,
    });

    try {
      const config = {
        sources: [
          {
            name: "tasks",
            type: "command",
            search: {
              cmd: "node",
              args: [path.join(fix.path, "search.js")],
            },
            map: {
              id: "id",
              title: "title",
            },
          },
        ],
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
      assert.equal(data.unverified.tasks.length, 2);
      assert.deepEqual(
        data.unverified.tasks.map((t) => t.id),
        ["1", "2"],
      );
    } finally {
      fix.cleanup();
    }
  });
});
