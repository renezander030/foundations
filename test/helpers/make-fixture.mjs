import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function makeFixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "foundations-"));

  for (const [name, content] of Object.entries(files)) {
    const full = path.join(dir, name);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }

  return {
    path: dir,
    cleanup() {
      fs.rmSync(dir, {
        recursive: true,
        force: true,
      });
    },
  };
}
