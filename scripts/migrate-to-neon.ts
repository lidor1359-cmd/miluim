/**
 * One-shot migration to Neon Postgres.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." pnpm tsx scripts/migrate-to-neon.ts
 *
 * What it does:
 *   1. Validates that DATABASE_URL points to Postgres
 *   2. Switches prisma/schema.prisma  provider sqlite → postgresql (idempotent)
 *   3. Runs `prisma generate`
 *   4. Runs `prisma db push` against the Neon DB
 *   5. Imports data from data-snapshot.json into Neon
 *
 * Prerequisites:
 *   - You ran `pnpm tsx scripts/export-data.ts` first (creates data-snapshot.json)
 *   - You have a Neon DATABASE_URL ready
 */
import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

function run(cmd: string, env?: NodeJS.ProcessEnv) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, {
    stdio: "inherit",
    env: { ...process.env, ...(env ?? {}) },
  });
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "ERROR: DATABASE_URL not set.\n" +
        "Usage:  DATABASE_URL=\"postgresql://...\" pnpm tsx scripts/migrate-to-neon.ts"
    );
    process.exit(1);
  }
  if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
    console.error(
      "ERROR: DATABASE_URL must start with postgresql:// or postgres://. Got: " +
        url.slice(0, 30) +
        "..."
    );
    process.exit(1);
  }

  // 1. Snapshot must exist
  const snapPath = resolve(process.cwd(), "data-snapshot.json");
  if (!existsSync(snapPath)) {
    console.error(
      "ERROR: data-snapshot.json not found.\n" +
        "Run first:  pnpm tsx scripts/export-data.ts"
    );
    process.exit(1);
  }
  console.log(`✓ Found data snapshot: ${snapPath}`);

  // 2. Switch schema provider
  const schemaPath = resolve(process.cwd(), "prisma/schema.prisma");
  const schema = readFileSync(schemaPath, "utf8");
  if (schema.includes('provider = "sqlite"')) {
    const updated = schema.replace(
      'provider = "sqlite"',
      'provider = "postgresql"'
    );
    writeFileSync(schemaPath, updated, "utf8");
    console.log("✓ Switched prisma/schema.prisma to postgresql");
  } else if (schema.includes('provider = "postgresql"')) {
    console.log("✓ Schema already on postgresql");
  } else {
    console.error("ERROR: Could not find provider line in schema.prisma");
    process.exit(1);
  }

  // 3. Generate Prisma client for postgres
  run("pnpm prisma generate");

  // 4. Push schema to Neon
  run("pnpm prisma db push --skip-generate");

  // 5. Import data
  run("pnpm tsx scripts/import-data.ts");

  console.log("\n========================================");
  console.log("Migration to Neon complete!");
  console.log("Next steps:");
  console.log("  1. Verify in Neon SQL editor:  SELECT count(*) FROM \"Soldier\";");
  console.log("  2. Commit & push:              git add -A && git commit -m 'switch to postgres'");
  console.log("  3. Set Netlify env vars:       DATABASE_URL, SESSION_SECRET, ADMIN_PASSWORD");
  console.log("========================================");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
