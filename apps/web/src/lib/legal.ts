// The privacy policy and terms are written in Markdown in docs/legal/ (the single source). This
// reads the small subset they use: # and ## headings, paragraphs, "-" lists, **bold** and _italic_.

export type Inline = { text: string; bold?: boolean; italic?: boolean; href?: string };

export type Block =
  | { kind: "h1"; parts: Inline[] }
  | { kind: "h2"; id: string; text: string }
  | { kind: "updated"; text: string }
  | { kind: "p"; parts: Inline[] }
  | { kind: "ul"; items: ListItem[] };

export type ListItem = { parts: Inline[]; children?: Inline[][] };

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
// Bookflow's own addresses written as plain text (e.g. bookflow-web-pearl.vercel.app/delete-account).
const SITE = /\b(?:bookflow-web-pearl\.vercel\.app|odpc\.go\.ke)(?:\/[\w-]+)*/;

/** Turns e-mail addresses and known site addresses inside a run into links. */
function linkify(run: Inline): Inline[] {
  const out: Inline[] = [];
  let rest = run.text;
  const pattern = new RegExp(`${EMAIL.source}|${SITE.source}`);
  for (let match = pattern.exec(rest); match; match = pattern.exec(rest)) {
    // A trailing full stop ends the sentence, not the address.
    const found = match[0].replace(/\.$/, "");
    if (match.index > 0) out.push({ ...run, text: rest.slice(0, match.index) });
    out.push({
      ...run,
      text: found,
      href: found.includes("@") ? `mailto:${found}` : `https://${found}`,
    });
    rest = rest.slice(match.index + found.length);
  }
  if (rest) out.push({ ...run, text: rest });
  return out;
}

/** **bold** and _italic_ runs, then links. */
export function parseInline(text: string): Inline[] {
  const runs: Inline[] = [];
  const pattern = /\*\*(.+?)\*\*|(?<![\w])_(.+?)_(?![\w])/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) runs.push({ text: text.slice(last, match.index) });
    if (match[1] !== undefined) runs.push({ text: match[1], bold: true });
    else runs.push({ text: match[2] ?? "", italic: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) runs.push({ text: text.slice(last) });
  return runs.flatMap(linkify);
}

export function parseLegal(markdown: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: ListItem[] | null = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const text = paragraph.join(" ");
    paragraph = [];
    const updated = /^_(Last updated):?\s*(.+)_$/.exec(text);
    if (updated && blocks.length === 1 && blocks[0]?.kind === "h1") {
      blocks.push({ kind: "updated", text: `${updated[1]} ${updated[2]}` });
    } else {
      blocks.push({ kind: "p", parts: parseInline(text) });
    }
  };
  const flushList = () => {
    if (list) blocks.push({ kind: "ul", items: list });
    list = null;
  };

  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const item = /^(\s*)- (.*)$/.exec(line);
    if (!line.trim()) {
      flushParagraph();
      flushList();
    } else if (line.startsWith("# ") || line.startsWith("## ")) {
      flushParagraph();
      flushList();
      const text = line.replace(/^#+ /, "").trim();
      blocks.push(
        line.startsWith("# ")
          ? { kind: "h1", parts: parseInline(text) }
          : { kind: "h2", id: slugify(text), text },
      );
    } else if (item) {
      flushParagraph();
      const parts = parseInline(item[2] ?? "");
      const parent = list?.at(-1);
      if ((item[1] ?? "").length >= 2 && parent) (parent.children ??= []).push(parts);
      else (list ??= []).push({ parts });
    } else {
      flushList();
      paragraph.push(line.trim());
    }
  }
  flushParagraph();
  flushList();
  return blocks;
}

/** The h2 headings, for the contents line. */
export function contents(blocks: Block[]): { id: string; text: string }[] {
  return blocks.flatMap((b) => (b.kind === "h2" ? [{ id: b.id, text: b.text }] : []));
}
