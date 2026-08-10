// Deliberate lint error, to prove CI goes red. Removed in the next commit.
export function canary(): string {
  const unused: number = 42;
  return 'canary';
}
