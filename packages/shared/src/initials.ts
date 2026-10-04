/**
 * Avatar letters: the first letter of an email ("dennis@…" → "D"), or the initials of up to two
 * words of a name ("Mary Achieng Otieno" → "MA"). "?" when there is nothing to use.
 */
export function initialsFor(text: string | null | undefined): string {
  const trimmed = (text ?? "").trim();
  if (trimmed.includes("@")) return firstLetter(trimmed.split("@")[0]!) ?? "?";
  const letters = trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map(firstLetter)
    .filter((letter): letter is string => !!letter);
  return letters.length > 0 ? letters.join("") : "?";
}

/** First character, upper-cased; whole code points so an emoji or accent isn't split. */
function firstLetter(word: string): string | undefined {
  return Array.from(word)[0]?.toUpperCase();
}
