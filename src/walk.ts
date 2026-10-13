// Independent proof-path receiver. This file deliberately has no runtime dependency
// on the path generator or the memetic-processing-unit closure algorithm.
import { parsePath } from "./path.ts";
import { type Atom, type Generator } from "./category.ts";
import { termKey } from "./term.ts";

/** Result of checking a canonical typed route against the supplied atomic generators. */
export interface WalkResult {
  readonly ok: boolean;
  readonly reason?: string;
}

/** Checks only *structural reachability*. It does not license inference rules
 * or prove an interpreted proposition: those require external soundness witnesses.
 * Every hop must occur among the exact supplied atomic generator edges.
 */
export function walk(atoms: readonly Atom[], path: string): WalkResult {
  const parsed = parsePath(path);
  if (!parsed) return { ok: false, reason: "malformed or noncanonical proof path" };
  // V1 term keys give bare strings and serialized non-strings the same spelling
  // in some cases (for example, a JSON-looking string and a compound cell).
  // Reject such ambiguous graph presentations rather than silently joining nodes.
  const termKinds = new Map<string, "literal" | "structured">();
  for (const atom of atoms) {
    for (const term of [atom.subject, atom.object]) {
      const key = termKey(term);
      if (typeof key !== "string") return { ok: false, reason: "nonserializable generator term" };
      const kind = typeof term === "string" ? "literal" : "structured";
      const previous = termKinds.get(key);
      if (previous !== undefined && previous !== kind) {
        return { ok: false, reason: "ambiguous structured/literal term identity" };
      }
      termKinds.set(key, kind);
    }
  }
  // Length-delimited tuple encoding avoids delimiter-injection aliasing.
  const keyOf = (source: string, kind: Generator, target: string): string =>
    JSON.stringify([source, kind, target]);
  const edges = new Set(atoms.map((a) => keyOf(termKey(a.subject), a.predicate, termKey(a.object))));
  let currentKey = parsed.rootKey;
  for (const step of parsed.steps) {
    const key = keyOf(currentKey, step.kind, step.nodeKey);
    if (!edges.has(key)) {
      return { ok: false, reason: `no ${step.kind} edge from ${currentKey} to ${step.nodeKey}` };
    }
    currentKey = step.nodeKey;
  }
  return { ok: true };
}
