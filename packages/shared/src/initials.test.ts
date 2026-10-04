import { describe, expect, it } from "vitest";

import { initialsFor } from "./initials";

describe("initialsFor (extra cases)", () => {
  it.each([
    ["amina.said@example.com", "A"],
    ["  Owner@Example.com ", "O"],
    ["@example.com", "?"],
    ["   ", "?"],
    [undefined, "?"],
    ["élodie mwangi", "ÉM"],
    ["Njeri\tKamau", "NK"],
  ])("%j → %j", (text, expected) => {
    expect(initialsFor(text)).toBe(expected);
  });
});
