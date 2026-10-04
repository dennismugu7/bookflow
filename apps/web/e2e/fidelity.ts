import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { expect, type Page } from "@playwright/test";

/** Shared by the fidelity screenshot specs (ADR 0009). Local Supabase only; fake data only. */

const MAILBOX = process.env.E2E_MAILBOX_URL ?? "http://127.0.0.1:54324";
export const SALON_ID = "a0000000-0000-4000-8000-0000000000aa";

/**
 * Saves the live screen to `dirs.out` and, when the design image is present, a design | live
 * side-by-side to `dirs.compare` (both 390 px wide, the design padded to the live height).
 */
export async function saveShot(
  page: Page,
  dirs: { out: string; designs: string; compare: string },
  name: string,
  design?: string,
) {
  mkdirSync(dirs.out, { recursive: true });
  const live = path.join(dirs.out, `${name}.png`);
  await page.screenshot({ path: live });
  const original = design ? path.join(dirs.designs, `${design}.png`) : null;
  if (!original || !existsSync(original)) return;
  mkdirSync(dirs.compare, { recursive: true });
  const dataUrl = (file: string) => `data:image/png;base64,${readFileSync(file, "base64")}`;
  const sheet = await page.context().newPage();
  await sheet.setViewportSize({ width: 900, height: 900 });
  await sheet.setContent(
    `<meta name="viewport" content="width=900"><body style="margin:0;background:#888;display:flex;gap:12px;padding:12px;width:max-content">
      <figure style="margin:0;font:600 14px sans-serif;color:#fff">design ${design}<div style="width:390px;height:844px;background:#ccc"><img src="${dataUrl(original)}" style="width:390px;display:block"></div></figure>
      <figure style="margin:0;font:600 14px sans-serif;color:#fff">live ${name}<img src="${dataUrl(live)}" style="width:390px;display:block"></figure>
    </body>`,
  );
  await sheet.locator("body").screenshot({ path: path.join(dirs.compare, `${name}.png`) });
  await sheet.close();
}

async function renderJpeg(
  page: Page,
  html: string,
  width: number,
  height: number,
): Promise<Buffer> {
  const image = await page.context().newPage();
  await image.setViewportSize({ width, height });
  // Without a viewport tag, mobile emulation lays the page out 980 px wide.
  await image.setContent(
    `<meta name="viewport" content="width=${width}"><body style="margin:0">${html}</body>`,
  );
  const jpeg = await image.screenshot({ type: "jpeg", quality: 85 });
  await image.close();
  return jpeg;
}

/** Uploads our abstract banner and logo and points the salon at them (secret key, local only). */
export async function addArtwork(page: Page) {
  const api = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SECRET_KEY!;
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const banner = await renderJpeg(
    page,
    `<div style="width:1200px;height:900px;background:radial-gradient(circle at 25% 30%,#7b67e8 0,#3a1fa8 45%,#16131f 100%)"></div>`,
    1200,
    900,
  );
  const logo = await renderJpeg(
    page,
    `<div style="width:256px;height:256px;background:#fff;display:flex;align-items:center;justify-content:center;font:700 150px serif;color:#d9a53a">A</div>`,
    256,
    256,
  );
  for (const [kind, body] of [
    ["banner", banner],
    ["logo", logo],
  ] as const) {
    const res = await fetch(
      `${api}/storage/v1/object/salon-media/${SALON_ID}/${kind}/showcase.jpg`,
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "image/jpeg", "x-upsert": "true" },
        body: new Uint8Array(body),
      },
    );
    expect(res.ok, `upload ${kind}`).toBe(true);
  }
  const res = await fetch(`${api}/rest/v1/salons?id=eq.${SALON_ID}`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      banner_path: `${SALON_ID}/banner/showcase.jpg`,
      logo_path: `${SALON_ID}/logo/showcase.jpg`,
    }),
  });
  expect(res.ok, "set artwork paths").toBe(true);
}

/** Deletes earlier emails to `email`, so a fixed address never picks up an old code. */
export async function clearMailbox(email: string): Promise<void> {
  await fetch(`${MAILBOX}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`, {
    method: "DELETE",
  });
}

export async function latestCode(email: string): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const list = (await (
      await fetch(`${MAILBOX}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)
    ).json()) as { messages?: { ID: string }[] };
    const id = list.messages?.[0]?.ID;
    if (id) {
      const message = (await (await fetch(`${MAILBOX}/api/v1/message/${id}`)).json()) as {
        Text?: string;
      };
      const code = /\b(\d{6})\b/.exec(message.Text ?? "")?.[1];
      if (code) return code;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`No code email for ${email}`);
}
