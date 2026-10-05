import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";
import sharp from "sharp";

import { getPublicSalon, salonArea } from "../../../../lib/salon";
import { shareImageInitial, shareImageSubtitle } from "../../../../lib/share-image";

const WIDTH = 1200;
const HEIGHT = 630;
const LOGO = 192;
/** The app blue, for salons without a banner. */
const BRAND_BLUE = "#1E7BF2";
/** The logo initial's gold (owner-v6 03). */
const INITIAL = "#C9962E";
const DAY = 86_400;
/** WhatsApp skips preview images over about 300 KB. */
const MAX_BYTES = 290_000;

const font = (file: string) => readFile(join(process.cwd(), "assets/fonts", file));

/** Downloads a stored image and crops it to size (cover, centred), as a data URI for Satori. */
async function fitted(url: string | null, width: number, height: number) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(width, height, { fit: "cover", position: "centre" })
      .jpeg({ quality: 85 })
      .toBuffer();
    return `data:image/jpeg;base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * The 1200×630 link preview WhatsApp shows (owner-v6 03): the banner, a soft dark gradient, the
 * logo circle and the salon's name and area in Urbanist. Rendered as PNG, sent as a small JPEG.
 */
export async function GET(_request: Request, ctx: RouteContext<"/s/[slug]/share-image">) {
  const { slug } = await ctx.params;
  const salon = await getPublicSalon(slug);
  if (!salon) return new Response("Not found", { status: 404 });

  const [banner, logo, area, medium, semibold, bold] = await Promise.all([
    fitted(salon.bannerUrl, WIDTH, HEIGHT),
    fitted(salon.logoUrl, LOGO, LOGO),
    salonArea(salon.address, salon.mapsUrl),
    font("Urbanist_500Medium.ttf"),
    font("Urbanist_600SemiBold.ttf"),
    font("Urbanist_700Bold.ttf"),
  ]);

  const png = new ImageResponse(
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        position: "relative",
        backgroundColor: BRAND_BLUE,
        fontFamily: "Urbanist",
      }}
    >
      {banner ? (
        // eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser
        <img src={banner} alt="" width={WIDTH} height={HEIGHT} style={{ position: "absolute" }} />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 380,
          backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.3))",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 56,
          right: 56,
          bottom: 51,
          display: "flex",
          alignItems: "center",
          gap: 42,
        }}
      >
        <div
          style={{
            width: LOGO,
            height: LOGO,
            flexShrink: 0,
            borderRadius: LOGO / 2,
            backgroundColor: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            boxShadow: "0 6px 24px rgba(0,0,0,0.18)",
          }}
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser
            <img src={logo} alt="" width={LOGO} height={LOGO} />
          ) : (
            <div style={{ fontSize: 86, fontWeight: 600, color: INITIAL, marginTop: -6 }}>
              {shareImageInitial(salon.name)}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 74,
              fontWeight: 700,
              lineHeight: 1.1,
              color: "#FFFFFF",
              textShadow: "0 2px 12px rgba(0,0,0,0.25)",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}
          >
            {salon.name}
          </div>
          <div
            style={{
              marginTop: 10,
              fontSize: 44,
              fontWeight: 500,
              color: "rgba(255,255,255,0.94)",
              textShadow: "0 2px 10px rgba(0,0,0,0.25)",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}
          >
            {shareImageSubtitle(area)}
          </div>
        </div>
      </div>
    </div>,
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: "Urbanist", data: medium, weight: 500, style: "normal" },
        { name: "Urbanist", data: semibold, weight: 600, style: "normal" },
        { name: "Urbanist", data: bold, weight: 700, style: "normal" },
      ],
    },
  );

  // Real photos come out far smaller; a very busy banner steps the quality down to stay under 300 KB.
  const source = Buffer.from(await png.arrayBuffer());
  let jpeg = await sharp(source).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  for (const quality of [70, 60]) {
    if (jpeg.length <= MAX_BYTES) break;
    jpeg = await sharp(source).jpeg({ quality, mozjpeg: true }).toBuffer();
  }

  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(jpeg.length),
      // The URL carries ?v=<updated_at>, so a day-long public cache never shows an old brand.
      "Cache-Control": `public, max-age=${DAY}, s-maxage=${DAY}, stale-while-revalidate=${DAY}`,
    },
  });
}
