import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { contents, parseInline, parseLegal, slugify } from "./legal";

const doc = (name: string) =>
  readFileSync(join(__dirname, "..", "..", "..", "..", "docs", "legal", name), "utf8");

describe("parseInline", () => {
  it("reads bold and italic runs", () => {
    expect(parseInline("A **bold** and _italic_ word")).toEqual([
      { text: "A " },
      { text: "bold", bold: true },
      { text: " and " },
      { text: "italic", italic: true },
      { text: " word" },
    ]);
  });

  it("leaves underscores inside words alone", () => {
    expect(parseInline("snake_case_name")).toEqual([{ text: "snake_case_name" }]);
  });

  it("links emails and the site, without the full stop", () => {
    expect(parseInline("Email support@mugu-labs.com.")).toEqual([
      { text: "Email " },
      { text: "support@mugu-labs.com", href: "mailto:support@mugu-labs.com" },
      { text: "." },
    ]);
    expect(parseInline("at bookflow-web-pearl.vercel.app/delete-account.")[1]).toEqual({
      text: "bookflow-web-pearl.vercel.app/delete-account",
      href: "https://bookflow-web-pearl.vercel.app/delete-account",
    });
  });
});

describe("parseLegal", () => {
  it("reads headings, the date, paragraphs and nested lists", () => {
    const blocks = parseLegal(
      "# Title\n\n_Last updated: 6 October 2026_\n\nIntro.\n\n## Who we share it with\n- **One**, as needed:\n  - a;\n  - b.\n- Two\n\nAfter.",
    );
    expect(blocks).toEqual([
      { kind: "h1", parts: [{ text: "Title" }] },
      { kind: "updated", text: "Last updated 6 October 2026" },
      { kind: "p", parts: [{ text: "Intro." }] },
      { kind: "h2", id: "who-we-share-it-with", text: "Who we share it with" },
      {
        kind: "ul",
        items: [
          {
            parts: [{ text: "One", bold: true }, { text: ", as needed:" }],
            children: [[{ text: "a;" }], [{ text: "b." }]],
          },
          { parts: [{ text: "Two" }] },
        ],
      },
      { kind: "p", parts: [{ text: "After." }] },
    ]);
  });

  it("reads both documents in docs/legal", () => {
    for (const name of ["privacy.md", "terms.md"]) {
      const blocks = parseLegal(doc(name));
      expect(blocks[0]?.kind).toBe("h1");
      expect(blocks[1]?.kind).toBe("updated");
      expect(contents(blocks).length).toBeGreaterThan(5);
      expect(JSON.stringify(blocks)).not.toContain("**");
    }
  });
});

describe("slugify", () => {
  it("makes anchor ids", () => {
    expect(slugify("How long we keep it")).toBe("how-long-we-keep-it");
    expect(slugify("Law")).toBe("law");
  });
});
