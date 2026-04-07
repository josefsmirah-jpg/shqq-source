import satori from "satori";
import sharp from "sharp";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type SatoriChild = SatoriEl | string | null | undefined | false;
interface SatoriEl { type: string; props: Record<string, unknown> }
function h(
  type: string,
  props: Record<string, unknown> | null,
  ...children: SatoriChild[]
): SatoriEl {
  const valid = children.filter((c): c is SatoriEl | string => c !== null && c !== undefined && c !== false);
  return {
    type,
    props: {
      ...(props ?? {}),
      ...(valid.length > 0 ? { children: valid.length === 1 ? valid[0] : valid } : {}),
    },
  };
}

const tajawalRegular = readFileSync(path.join(__dirname, "../fonts/Tajawal-Regular.ttf"));
const tajawalBold    = readFileSync(path.join(__dirname, "../fonts/Tajawal-Bold.ttf"));
const logoB64        = readFileSync(path.join(__dirname, "../fonts/logo.jpeg")).toString("base64");
const LOGO_URI       = `data:image/jpeg;base64,${logoB64}`;

const BG       = "#1A5C2E";
const BG_DARK  = "#13441F";
const BG_LIGHT = "#20703A";
const BG_ALT   = "#1E6832";
const GOLD     = "#C9A022";
const GOLD_LT  = "#E0B840";
const WHITE    = "#ffffff";
const TBL_BRD  = "rgba(201,160,34,0.4)";
const FONT     = "Tajawal";
const W        = 380;

const CARD_NOTE =
  "مع شركة شقق وأراضي المستقبل نقدم لكم أفضل العروض والأسعار بأعلى مستويات الجودة في التشطيب السوبر ديلوكس";
const FIXED_PHONE = "0798561011";

export interface CardFloor { name: string; area: string | null; price: string | null; }
export interface CardListing {
  id: number; cardNumber: number; region: string;
  projectName?: string | null; propertyType?: string | null;
  area?: string | null; price?: string | null; floor?: string | null;
  description?: string | null; isFeatured?: boolean; ownerPhone?: string | null;
  mapsLink?: string | null; images?: string[]; floors?: CardFloor[];
}

// ─── RTL fix: عكس ترتيب الكلمات في النص العربي ─────────────────────────────
const ARABIC_RE = /[\u0600-\u06FF]/;

function ra(text: string): string {
  if (!text || !ARABIC_RE.test(text)) return text;
  return text.split(" ").reverse().join(" ");
}

// تقسيم النص إلى أسطر مستقلة قبل تمريره لـ Satori
// كل سطر عنصر flex مستقل في عمود → لا يتأثر بـ RTL direction
function splitLines(text: string, maxChars: number): string[] {
  if (!text) return [""];
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (t.length <= maxChars) { cur = t; }
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

// ─── helpers ──────────────────────────────────────────────────────────────────
const hDiv = (style: Record<string, unknown>, ...children: SatoriChild[]) =>
  h("div", { style: { display: "flex", ...style } }, ...children);

const txt = (content: string, style: Record<string, unknown>) =>
  h("div", { style: { display: "flex", fontFamily: FONT, ...style } }, content);

const divider = (clr: string, thick = 1) =>
  hDiv({ height: thick, backgroundColor: clr, width: "100%" });

const vDivEl = (clr: string) =>
  hDiv({ width: 1, backgroundColor: clr, alignSelf: "stretch" });

const tableCell = (content: string, clr: string) => {
  const lines = splitLines(content, 11);
  const lineStyle = { fontSize: 14, fontWeight: 600, color: clr, lineHeight: 1.35, textAlign: "center" };
  return hDiv({ flex: 1, alignItems: "center", justifyContent: "center", padding: "10px 5px" },
    hDiv({ flexDirection: "column", alignItems: "center", width: "100%" },
      ...lines.map(l => txt(ra(l), lineStyle))
    )
  );
};

const tableHeaderCell = (content: string, clr: string) =>
  hDiv({ flex: 1, alignItems: "center", justifyContent: "center", padding: "10px 5px" },
    txt(content, { fontSize: 13, fontWeight: 800, color: clr, textAlign: "center" }),
  );

// RTL: السعر (أول=يمين) | المساحة | الطابق (أخير=يسار)
const tableRow = (bg: string, name: string, area: string, price: string) =>
  hDiv({
    flexDirection: "row", backgroundColor: bg, width: "100%",
    borderBottom: `1px solid ${TBL_BRD}`,
  },
    tableCell(price, GOLD_LT),
    vDivEl(TBL_BRD),
    tableCell(area, WHITE),
    vDivEl(TBL_BRD),
    tableCell(name, WHITE),
  );

// ─── main ──────────────────────────────────────────────────────────────────────
export async function generateCardImage(listing: CardListing): Promise<Buffer> {
  const location = (listing.projectName && listing.projectName.trim() !== listing.region.trim())
    ? `${listing.region} - ${listing.projectName}`
    : listing.region;

  const phone = (listing.isFeatured && listing.ownerPhone) ? listing.ownerPhone : FIXED_PHONE;

  const floors = (listing.floors ?? []).filter(
    (f) => (f.price && f.price.trim()) || (f.area && f.area.trim())
  );
  const numPhotos   = listing.images?.length ?? 0;
  const hasDesc     = !!(listing.description?.trim());
  const hasMapsLink = !!(listing.mapsLink?.trim());

  const dataRows: SatoriEl[] = floors.length
    ? floors.flatMap((f, i) => [
        tableRow(
          i % 2 === 0 ? BG : BG_ALT,
          f.name,
          f.area ? `${f.area} م²` : "—",
          f.price || "—",
        ),
      ])
    : [
        tableRow(
          BG,
          listing.propertyType || "—",
          listing.area ? `${listing.area} م²` : "—",
          listing.price || "—",
        ),
        ...(listing.floor
          ? [hDiv({
              backgroundColor: BG_ALT, padding: "10px 14px",
              borderBottom: `1px solid ${TBL_BRD}`,
            },
              txt(ra(`الطابق: ${listing.floor}`), { fontSize: 14, fontWeight: 600, color: WHITE, textAlign: "right", width: "100%" }),
            )]
          : []),
      ];

  const nRows         = floors.length || (listing.floor ? 2 : 1);
  const noteLineCount = splitLines(CARD_NOTE, 22).length;
  const descLineCount = hasDesc ? splitLines(listing.description!, 36).length : 0;
  const noteAreaH     = Math.max(100, noteLineCount * 20 + 24);
  const descAreaH     = hasDesc ? descLineCount * 20 + 22 : 0;
  const H =
    88 + 2 +
    (listing.isFeatured ? 32 : 0) +
    52 +
    38 + nRows * 50 +
    descAreaH +
    2 + noteAreaH +
    (hasMapsLink ? 38 : 0) +
    2 + 36 +
    (numPhotos > 0 ? 28 : 0);

  const el = h("div", {
    style: {
      display: "flex", flexDirection: "column",
      width: W, height: H,
      backgroundColor: BG, fontFamily: FONT,
      direction: "rtl",
    },
  },

    hDiv({
      flexDirection: "row", alignItems: "center",
      justifyContent: "space-between", padding: "12px 14px",
    },
      hDiv({ flexDirection: "column", flex: 1, alignItems: "flex-end" },
        txt(ra("شقق وأراضي المستقبل"), { color: GOLD, fontSize: 17, fontWeight: 800 }),
        txt(ra("للاستثمار العقاري المتميز"), { color: GOLD_LT, fontSize: 11, marginTop: 2 }),
      ),
      hDiv({
        width: 62, height: 62, marginLeft: 12,
        backgroundColor: WHITE, borderRadius: 10, overflow: "hidden",
        alignItems: "center", justifyContent: "center",
      },
        h("img", { src: LOGO_URI, width: 58, height: 58, style: { objectFit: "contain" } }),
      ),
    ),

    divider(GOLD, 2),

    listing.isFeatured
      ? hDiv({
          alignItems: "center", justifyContent: "center",
          backgroundColor: GOLD, padding: "6px 0",
        },
          txt(ra("🚀 إعلان مميز"), { color: BG, fontWeight: 800, fontSize: 13 }),
        )
      : null,

    hDiv({
      alignItems: "center", justifyContent: "center",
      backgroundColor: GOLD, padding: "12px 16px",
    },
      txt(ra(`◆  ${location}  ◆`), { color: BG, fontSize: 16, fontWeight: 800, textAlign: "center", width: "100%", justifyContent: "center" }),
    ),

    hDiv({
      flexDirection: "column", width: "100%",
      borderTop: `1px solid ${TBL_BRD}`,
    },
      hDiv({
        flexDirection: "row", backgroundColor: BG_LIGHT, width: "100%",
        borderBottom: `1px solid ${TBL_BRD}`,
      },
        tableHeaderCell(ra("السعر"), GOLD),
        vDivEl(TBL_BRD),
        tableHeaderCell(ra("المساحة"), GOLD),
        vDivEl(TBL_BRD),
        tableHeaderCell(ra(floors.length ? "الطابق" : "مواصفات"), GOLD),
      ),
      ...dataRows,
    ),

    hasDesc
      ? hDiv({
          padding: "10px 14px", backgroundColor: BG_ALT,
          borderTop: `1px solid ${TBL_BRD}`,
        },
          hDiv({ flexDirection: "column", width: "100%" },
            ...splitLines(listing.description!, 36).map(line =>
              txt(ra(line), { fontSize: 13, color: "#b0cdb8", lineHeight: 1.55, textAlign: "right", width: "100%" })
            )
          ),
        )
      : null,

    divider(GOLD, 2),

    hDiv({
      flexDirection: "row", backgroundColor: BG, minHeight: noteAreaH,
      borderTop: `1px solid ${TBL_BRD}`,
    },
      hDiv({
        flex: 3, padding: "12px 12px",
        alignItems: "center", justifyContent: "center",
      },
        hDiv({ flexDirection: "column", width: "100%" },
          ...splitLines(CARD_NOTE, 22).map(l =>
            txt(ra(l), { fontSize: 12, color: WHITE, fontWeight: 500, lineHeight: 1.65, textAlign: "right", width: "100%" })
          )
        ),
      ),
      vDivEl(GOLD),
      hDiv({
        flex: 2, flexDirection: "column", padding: "10px 8px",
        alignItems: "center", justifyContent: "center",
        backgroundColor: BG_LIGHT, gap: 3,
      },
        txt("📞", { fontSize: 20, color: GOLD }),
        h("div", {
          style: {
            display: "flex", color: GOLD, fontSize: 13, fontWeight: 800,
            fontFamily: FONT, textAlign: "center",
          },
        }, phone),
        txt(ra("للتواصل"), { color: GOLD_LT, fontSize: 12 }),
      ),
    ),

    hasMapsLink
      ? hDiv({
          alignItems: "center", justifyContent: "center",
          backgroundColor: BG_DARK, padding: "9px 14px",
          borderTop: `1px solid ${TBL_BRD}`,
        },
          txt(ra("📍 عرض الموقع على الخريطة"), { color: GOLD, fontSize: 13, fontWeight: 700 }),
        )
      : null,

    divider(GOLD, 2),

    hDiv({
      flexDirection: "row", justifyContent: "space-between",
      padding: "8px 14px", backgroundColor: GOLD,
    },
      txt(ra(`بطاقة #${listing.cardNumber}`), { color: BG, fontWeight: 800, fontSize: 13 }),
      txt(ra("شقق وأراضي المستقبل"), { color: BG, fontWeight: 800, fontSize: 13 }),
    ),

    numPhotos > 0
      ? hDiv({
          alignItems: "center", justifyContent: "center",
          backgroundColor: BG_DARK, padding: "5px 14px",
        },
          txt(ra(`اسحب يميناً لمشاهدة الصور (${numPhotos})`), { color: GOLD_LT, fontSize: 11 }),
        )
      : null,
  );

  const svg = await satori(el as any, {
    width: W,
    height: H,
    fonts: [
      { name: FONT, data: tajawalRegular, weight: 400, style: "normal" },
      { name: FONT, data: tajawalBold,    weight: 800, style: "normal" },
    ],
  });

  return sharp(Buffer.from(svg), { density: 216 })
    .png({ compressionLevel: 0, effort: 1 })
    .toBuffer();
}
