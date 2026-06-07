// proof-pathing.test.ts — behavioral proof that a path is a proof. Run: node --test (Node ≥ 22.18).
import { test } from "node:test";
import assert from "node:assert/strict";

import { structureOf, prove, walk, proves, cellOf, MORPHISM_KEYS } from "./index.ts";

// ── specialization: the is-a /library/ type-path (the grow.mjs spine) ───────────

test("a specialization (is-a) chain renders the typed /library/ path that proves the target", () => {
  const cells = [
    { subject: "room", predicate: "is-a", object: "paracosm" },
    { subject: "paracosm", predicate: "is-a", object: "category" },
  ];
  const atoms = structureOf(cells); // category →specialization→ paracosm →specialization→ room

  const p = prove(atoms, "category", "room");
  assert.equal(p.ok, true);
  assert.deepEqual(p.generators, ["specialization", "specialization"]);
  assert.equal(p.path, "category/specialization/library/paracosm/specialization/library/room");
  assert.equal(walk(atoms, p.path!).ok, true);
});

test("reachability is the LFP closure and is directed (general → specific, not back)", () => {
  const cells = [
    { subject: "room", predicate: "is-a", object: "paracosm" },
    { subject: "paracosm", predicate: "is-a", object: "category" },
  ];
  const atoms = structureOf(cells);
  assert.equal(proves(atoms, "category", "room"), true); // transitive closure composes the two steps
  assert.equal(proves(atoms, "room", "category"), false); // specialization runs type → instance only
});

// ── the relational generators: converse, subject-/object-projection ─────────────

test("a relational cell contributes converse + subject-projection + object-projection edges", () => {
  const atoms = structureOf([{ subject: "socrates", predicate: "teaches", object: "plato" }]);
  const node = cellOf("socrates", "teaches", "plato");

  const toObject = prove(atoms, node, "plato");
  assert.deepEqual(toObject.generators, ["object-projection"]);
  assert.equal(walk(atoms, toObject.path!).ok, true);

  const toSubject = prove(atoms, node, "socrates");
  assert.deepEqual(toSubject.generators, ["subject-projection"]);

  const toConverse = prove(atoms, node, cellOf("plato", "teaches", "socrates"));
  assert.deepEqual(toConverse.generators, ["converse"]);
});

// ── a mixed-generator proof: composition across kinds (saturate's μ) ────────────

test("a proof composes generators of different kinds (specialization then object-projection)", () => {
  const cell = cellOf("socrates", "teaches", "plato");
  const atoms = structureOf([
    { subject: "socrates", predicate: "teaches", object: "plato" },
    { subject: cell, predicate: "is-a", object: "teaching-relation" }, // teaching-relation →spec→ cell
  ]);

  const p = prove(atoms, "teaching-relation", "plato");
  assert.equal(p.ok, true);
  assert.deepEqual(p.generators, ["specialization", "object-projection"]);
  assert.equal(walk(atoms, p.path!).ok, true);
});

// ── the proof term is checkable, and the address is deterministic (Yoneda) ───────

test("walk rejects a path whose hops are not real generator edges", () => {
  const atoms = structureOf([
    { subject: "room", predicate: "is-a", object: "paracosm" },
  ]);
  assert.equal(walk(atoms, "paracosm/converse/library/room").ok, false); // it is a specialization, not converse
  assert.equal(walk(atoms, "paracosm/specialization/library/room").ok, true);
});

test("same structure yields the same path — the term is its own collision-free index", () => {
  const cells = [{ subject: "room", predicate: "is-a", object: "paracosm" }];
  assert.equal(prove(structureOf(cells), "paracosm", "room").path, prove(structureOf(cells), "paracosm", "room").path);
});

test("the four generator slots are the canonical predicate-category classes", () => {
  assert.deepEqual([...MORPHISM_KEYS], ["specialization", "converse", "subject-projection", "object-projection"]);
});
