import { execSync } from "node:child_process";

function run(command: string) {
  execSync(command, {
    stdio: "inherit",
    env: process.env,
  });
}

export default async function globalSetup() {
  run("npx prisma generate");
  run("npx prisma migrate deploy");
  run("npm run db:seed:real-mode");
  run("node --env-file=.env scripts/sync-pos-catalog.mjs");
  run("node --env-file=.env scripts/seed-sample-members-trainers.mjs");
}