import { readFileSync } from "node:fs";
import { join } from "node:path";

import { contents, parseLegal, type Inline } from "../lib/legal";
import { SiteHeader } from "./site-header";

/** docs/legal/<name>, read when the page is built (the docs stay the single source). */
export function readLegal(name: "privacy.md" | "terms.md") {
  return parseLegal(readFileSync(join(process.cwd(), "..", "..", "docs", "legal", name), "utf8"));
}

function Runs({ parts }: { parts: Inline[] }) {
  return parts.map((part, i) => {
    let node: React.ReactNode = part.text;
    if (part.href) {
      node = (
        <a href={part.href} className="text-action-blue underline-offset-2 hover:underline">
          {node}
        </a>
      );
    }
    if (part.italic) node = <em>{node}</em>;
    if (part.bold) node = <strong className="font-semibold">{node}</strong>;
    return <span key={i}>{node}</span>;
  });
}

const bullet = "relative pl-[13px] before:absolute before:left-0 before:content-['·']";

/** The privacy policy or the terms (owner-v7 07): plain text in the site's style. */
export function LegalDocument({ name }: { name: "privacy.md" | "terms.md" }) {
  const blocks = readLegal(name);
  const sections = contents(blocks);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[680px] px-[22px] pt-[24px] pb-12 text-[15px] leading-[23px]">
        {blocks.map((block, i) => {
          switch (block.kind) {
            case "h1":
              return (
                <h1 key={i} className="text-[28px] leading-[35px] font-bold">
                  <Runs parts={block.parts} />
                </h1>
              );
            case "updated":
              return (
                <p key={i} className="text-[14px] text-muted">
                  {block.text}
                </p>
              );
            case "h2":
              return (
                <h2
                  key={i}
                  id={block.id}
                  className="mt-[22px] scroll-mt-4 text-[18px] leading-6 font-bold"
                >
                  <a href={`#${block.id}`} className="hover:underline">
                    {block.text}
                  </a>
                </h2>
              );
            case "p":
              return (
                <p key={i} className="mt-[10px] max-w-[65ch]">
                  <Runs parts={block.parts} />
                </p>
              );
            case "ul":
              return (
                <ul key={i} className="mt-[10px] flex max-w-[65ch] flex-col gap-[4px]">
                  {block.items.map((item, j) => (
                    <li key={j} className={bullet}>
                      <Runs parts={item.parts} />
                      {item.children ? (
                        <ul className="mt-[4px] flex flex-col gap-[4px]">
                          {item.children.map((child, k) => (
                            <li key={k} className={bullet}>
                              <Runs parts={child} />
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              );
          }
        })}
        <nav aria-label="Contents" className="mt-6 text-[14px] leading-[17px] text-muted">
          Contents
          {sections.map((s) => (
            <span key={s.id}>
              {" · "}
              <a href={`#${s.id}`} className="hover:underline">
                {s.text}
              </a>
            </span>
          ))}
        </nav>
      </main>
    </>
  );
}
