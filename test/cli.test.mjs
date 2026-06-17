import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { spawnCli } from "./helpers/spawn-cli.mjs";

describe("cli", () => {
  it("help exits 0", () => {
    const result = spawnCli(["help"]);
    assert.equal(result.status, 0);
  });

  it("sources emits valid JSON", () => {
    const result = spawnCli(["sources"]);
    assert.equal(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.ok(data);
    assert.ok(Array.isArray(data.sources));
  });

  it("sources --human emits readable text", () => {
    const result = spawnCli(["sources", "--human"]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /foundations sweeps THESE first/i);
  });

  it("check emits valid JSON", () => {
    const result = spawnCli(["check", "vector search"]);
    assert.equal(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.equal(data.query, "vector search");
    assert.equal(typeof data.verdict, "string");
    assert.ok(data.proven);
    assert.ok(data.unverified);
  });

  it("check --human emits readable text", () => {
    const result = spawnCli(["check", "vector search", "--human"]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /VERDICT:/i);
  });

  it("query shorthand matches check command", () => {
    const explicit = spawnCli(["check", "vector search"]);
    const shorthand = spawnCli(["vector search"]);
    assert.equal(explicit.status, 0);
    assert.equal(shorthand.status, 0);
    const a = JSON.parse(explicit.stdout);
    const b = JSON.parse(shorthand.stdout);
    assert.deepEqual(b, a);
  });

  it("empty check command exits non-zero", () => {
    const result = spawnCli(["check"]);
    assert.notEqual(result.status, 0);
  });
});
