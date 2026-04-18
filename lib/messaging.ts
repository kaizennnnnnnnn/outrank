// Helpers for the 1:1 messaging feature.
//
// A thread id is a deterministic, alphabetically-sorted combination of the
// two participant uids joined by `_`. This gives both sides the same id
// without needing to ask anyone "who started the conversation".

export function threadIdFor(a: string, b: string): string {
  return [a, b].sort().join('_');
}
