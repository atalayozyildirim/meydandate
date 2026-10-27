// Ensures the legal seed migration is exactly what docs/legal/*.md produce and
// that the documents satisfy the client contract (src/features/community/access).
// Run: node --test supabase/tests/legal-documents.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSeedSql, loadLegalDocuments, LEGAL_KINDS } from "../../doc/legal/build-seed.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seedFile = readdirSync(join(root, "supabase/migrations")).find((f) =>
  f.endsWith("_community_legal_documents_seed.sql"),
);

test("seed migration matches docs/legal sources", () => {
  assert.ok(seedFile, "seed migration exists");
  const migration = readFileSync(join(root, "supabase/migrations", seedFile), "utf8");
  assert.equal(migration.replace(/\r\n/g, "\n"), buildSeedSql());
});

test("four complete plain-text documents with the expected contact and no fabricated fields", () => {
  const docs = loadLegalDocuments();
  assert.deepEqual(docs.map((d) => d.kind), LEGAL_KINDS);
  for (const doc of docs) {
    assert.match(doc.version, /^[0-9A-Za-z._-]{1,100}$/);
    assert.ok(doc.body.length > 1500, `${doc.kind} is substantial`);
    assert.doesNotMatch(doc.body, /<[a-z!/]/i, `${doc.kind} has no HTML`);
    assert.match(doc.body, /atalayozyildirim@gmail\.com/);
    assert.doesNotMatch(doc.body, /VKN|MERSİS|Vergi No/i, "no invented tax identity");
  }
  const kvkk = docs.find((d) => d.kind === "kvkk").body;
  assert.match(kvkk, /Atalay Özyıldırım/);
  assert.match(kvkk, /rıza talebi değildir/, "information notice is separated from consent");
  for (const right of ["düzeltilmesini", "silinmesini", "itiraz", "zararın giderilmesini"])
    assert.match(kvkk, new RegExp(right));
});
