import assert from "node:assert/strict";
import { test } from "node:test";

import { walk } from "./walk.ts";
import { parsePath } from "./path.ts";
import { sanitizeSegment } from "./term.ts";
import { structureOf } from "./category.ts";

test("an authentic specialization path replays against original generator atoms", () => {
  const atoms = structureOf([
    { subject: "room", predicate: "is-a", object: "paracosm" },
    { subject: "paracosm", predicate: "is-a", object: "category" },
  ]);
  const route = "category/specialization/library/paracosm/specialization/library/room";
  assert.equal(walk(atoms, route).ok, true);
});

test("a delimiter injection cannot impersonate a different generator edge", () => {
  const atoms = [
    { subject: "root|converse|middle", predicate: "converse" as const, object: "end" },
  ];
  const injected = `root/converse/library/${sanitizeSegment("middle|converse|end")}`;
  const authentic = `${sanitizeSegment("root|converse|middle")}/converse/library/end`;
  assert.equal(walk(atoms, injected).ok, false);
  assert.equal(walk(atoms, authentic).ok, true);
});

test("different byte spellings of the same path cannot pass the receiver", () => {
  const atoms = structureOf([{ subject: "room", predicate: "is-a", object: "paracosm" }]);
  const malformed = [
    "~70aracosm/specialization/library/room", // needless escape for 'p'
    "paracosm/specialization/library/roo~6d", // needless escape for 'm'
    "paracosm/specialization/library/roo~GG", // invalid hex escape
    "paracosm/converse/library/room", // unauthorized generator
    "paracosm/specialization/library/unknown", // missing target
    "paracosm/specialization/elsewhere/room", // malformed route shape
  ];
  for (const path of malformed) {
    assert.equal(walk(atoms, path).ok, false, path);
  }
  assert.equal(parsePath("paracosm/specialization/library/room")?.rootKey, "paracosm");
});

test("receiver does not rely on the closure solver or other runtime packages", () => {
  // This module imports only ./walk.ts, ./path.ts, ./term.ts and ./category.ts.
  // Tests run without npm install and cover an untrusted external witness.
  const atoms = [{ subject: "a", predicate: "object-projection" as const, object: "b" }];
  assert.equal(walk(atoms, "a/object-projection/library/b").ok, true);
  assert.equal(walk(atoms, "b/object-projection/library/a").ok, false);
});
