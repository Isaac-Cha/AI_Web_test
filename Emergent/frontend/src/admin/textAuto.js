import { pinyin } from "pinyin-pro";

function cleanSlug(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export function autoEnglishFromZh(zh) {
  const raw = pinyin(zh || "", { toneType: "none", type: "array" })
    .filter(Boolean)
    .join(" ");
  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function autoId(prefix, zhOrName) {
  const raw = pinyin(zhOrName || "", { toneType: "none" });
  const slug = cleanSlug(raw);
  const suffix = Math.random().toString(36).slice(2, 6);
  if (!slug) return `${prefix}-${suffix}`;
  return `${prefix}-${slug}-${suffix}`;
}

