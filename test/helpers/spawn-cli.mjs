import { spawnSync } from "node:child_process";

export function spawnCli(args, env = {}) {
  const result = spawnSync(process.execPath, ["bin/foundations", ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      ...env,
    },
  });

  return result;
}
