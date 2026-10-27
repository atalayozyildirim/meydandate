#!/usr/bin/env node
// Runs repository migrations and SQL tests in an in-process Postgres (PGlite).
//
// Usage:
//   PGLITE_MODULE=/abs/path/node_modules/@electric-sql/pglite/dist/index.js \
//     node supabase/tests/harness/run.mjs [filter]
//
// PGlite is intentionally not a project dependency (package.json is shared and
// coordinated). Install it anywhere (`npm i @electric-sql/pglite` in a scratch
// dir) and point PGLITE_MODULE at it, or add it as a devDependency later.
//
// Each `-- @test <name>` block in supabase/tests/*.test.sql runs inside its own
// transaction which is rolled back afterwards. PGlite is single-connection, so
// true concurrency races cannot be reproduced here; lock-based logic is tested
// sequentially and real concurrent tests must run against `supabase start`.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const migrationsDir = join(root, "supabase/migrations");
const testsDir = join(root, "supabase/tests");
const filter = process.argv[2] ?? "";

async function loadPGlite() {
  const candidates = [process.env.PGLITE_MODULE, "@electric-sql/pglite"].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const spec = candidate.startsWith("/") ? pathToFileURL(candidate).href : candidate;
      return (await import(spec)).PGlite;
    } catch {
      /* try next */
    }
  }
  console.error("PGlite not found. Set PGLITE_MODULE to @electric-sql/pglite/dist/index.js.");
  process.exit(2);
}

// Platform-only statements that PGlite cannot run are replaced by shims.
function adaptMigration(sql) {
  return sql
    .replace(/create\s+extension\s+if\s+not\s+exists\s+pg_cron[^;]*;/gi, "-- pg_cron shimmed;")
    .replace(/create\s+extension\s+if\s+not\s+exists\s+pg_net[^;]*;/gi, "-- pg_net shimmed;")
    .replace(/notify\s+pgrst\s*,\s*'[^']*'\s*;/gi, "-- notify pgrst skipped;");
}

export async function createDatabase() {
  const PGlite = await loadPGlite();
  const db = new PGlite();
  await db.exec(readFileSync(join(here, "supabase-shim.sql"), "utf8"));
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    try {
      await db.exec(adaptMigration(readFileSync(join(migrationsDir, file), "utf8")));
    } catch (error) {
      throw new Error(`Migration ${file} failed: ${error.message}`);
    }
  }
  await db.exec(readFileSync(join(here, "test-helpers.sql"), "utf8"));
  return { db, migrations: files.length };
}

function parseTests(file) {
  const text = readFileSync(join(testsDir, file), "utf8");
  const parts = text.split(/^-- @test\s+/m);
  const setup = parts.shift() ?? "";
  return {
    setup,
    tests: parts.map((part) => {
      const newline = part.indexOf("\n");
      return { name: part.slice(0, newline).trim(), sql: part.slice(newline + 1) };
    }),
  };
}

async function main() {
  const started = Date.now();
  const { db, migrations } = await createDatabase();
  console.log(`Applied ${migrations} migrations in ${Date.now() - started} ms`);
  const files = readdirSync(testsDir).filter((f) => f.endsWith(".test.sql")).sort();
  let passed = 0;
  let failed = 0;
  for (const file of files) {
    const { setup, tests } = parseTests(file);
    if (setup.trim()) await db.exec(setup);
    for (const test of tests) {
      const label = `${file} › ${test.name}`;
      if (filter && !label.includes(filter)) continue;
      try {
        await db.exec(`begin;\n${test.sql}\n;rollback;`);
        passed += 1;
        console.log(`  ok   ${label}`);
      } catch (error) {
        failed += 1;
        await db.exec("rollback;").catch(() => {});
        await db.exec("reset role;").catch(() => {});
        console.log(`  FAIL ${label}\n       ${error.message}`);
      }
    }
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  await db.close();
  process.exit(failed ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
