export function arabicToEnglish(str: string): string {
  return str
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0));
}

export function englishToArabic(str: string): string {
  return str.replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);
}

export function normalizeNumber(str: string): string {
  return arabicToEnglish(str).replace(/[^0-9.]/g, "");
}

export function toHijri(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();

  let jd =
    Math.floor((1461 * (y + 4800 + Math.floor((m - 14) / 12))) / 4) +
    Math.floor((367 * (m - 2 - 12 * Math.floor((m - 14) / 12))) / 12) -
    Math.floor((3 * Math.floor((y + 4900 + Math.floor((m - 14) / 12)) / 100)) / 4) +
    d -
    32075;

  const z = jd - 1948440 + 10632;
  const n = Math.floor((z - 1) / 10631);
  const zn = z - 10631 * n + 354;
  const j =
    Math.floor((10985 - zn) / 5316) * Math.floor((50 * zn) / 17719) +
    Math.floor(zn / 5670) * Math.floor((43 * zn) / 15238);
  const zj =
    zn -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const hm = Math.floor((24 * zj) / 709);
  const hd = zj - Math.floor((709 * hm) / 24);
  const hy = 30 * n + j - 30;

  const months = [
    "محرم","صفر","ربيع الأول","ربيع الآخر",
    "جمادى الأولى","جمادى الآخرة","رجب","شعبان",
    "رمضان","شوال","ذو القعدة","ذو الحجة"
  ];

  return `${hd} ${months[hm - 1] || ""} ${hy}هـ`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const hijri = toHijri(date);
  const gregorian = date.toLocaleDateString("ar-JO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return `${gregorian} | ${hijri}`;
}

export const PROPERTY_TYPES = [
  "شقة", "أرض", "فيلا", "تجاري", "مستودع", "بناء كامل", "مزرعة", "استراحة", "شاليه", "عيادة", "مكتب"
];

export const PACKAGES = [
  { key: "1month", label: "شهر واحد", price: 75, duration: "شهر" },
  { key: "3months", label: "٣ أشهر", price: 200, duration: "٣ أشهر" },
  { key: "6months", label: "٦ أشهر", price: 350, duration: "٦ أشهر" },
  { key: "1year", label: "سنة كاملة", price: 600, duration: "سنة" },
];

export const FIXED_PHONE = "0798561011";

export const CARD_NOTE = "مع شركة شقق وأراضي المستقبل نقدم لكم أفضل العروض والأسعار ؛ بأعلى مستويات الجودة في التشطيب السوبر ديلوكس";
