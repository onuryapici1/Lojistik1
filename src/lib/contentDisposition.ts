const TR_MAP: Record<string, string> = {
  ç: "c", Ç: "C",
  ğ: "g", Ğ: "G",
  ı: "i", I: "I",
  İ: "I",
  ö: "o", Ö: "O",
  ş: "s", Ş: "S",
  ü: "u", Ü: "U",
};

function toAscii(value: string): string {
  return value
    .split("")
    .map((ch) => TR_MAP[ch] ?? ch)
    .join("")
    .replace(/[^\x20-\x7E]/g, "_");
}

export function contentDispositionHeader(fileName: string): string {
  const asciiName = toAscii(fileName);
  const encoded = encodeURIComponent(fileName);
  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encoded}`;
}
