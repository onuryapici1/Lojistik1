/**
 * Content-Disposition başlığı.
 *
 * Dosya adında Türkçe karakter olduğu için hem ASCII'ye indirgenmiş bir
 * `filename` hem de UTF-8 kodlanmış `filename*` veriyoruz; eski tarayıcılar
 * birincisini, yeniler ikincisini kullanıyor.
 */

const TR_HARITA: Record<string, string> = {
  ç: "c", Ç: "C", ğ: "g", Ğ: "G", ı: "i", İ: "I",
  ö: "o", Ö: "O", ş: "s", Ş: "S", ü: "u", Ü: "U",
};

export function asciiyeIndir(ad: string): string {
  return ad
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (h) => TR_HARITA[h] ?? h)
    .replace(/[^\x20-\x7E]/g, "_")
    // Tırnak ve ters bölü başlığın sözdizimini bozar.
    .replace(/["\\]/g, "_");
}

export function indirmeBasligi(dosyaAdi: string): string {
  const ascii = asciiyeIndir(dosyaAdi);
  const kodlu = encodeURIComponent(dosyaAdi);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${kodlu}`;
}

/**
 * Çıktı dosyasının adı.
 *
 * Bu modül bilerek bağımlılıksız: istemci tarafı da kullanıyor ve
 * xlsx.ts'ten import edilseydi ExcelJS tarayıcı paketine girerdi.
 */
export function dosyaAdi(
  form: { sube?: string; siparisTarihi?: string },
  uzanti: string,
): string {
  const parcalar = ["Malzeme-Siparis-Formu"];
  if (form.sube) {
    const temiz = form.sube
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    if (temiz) parcalar.push(temiz);
  }
  if (form.siparisTarihi) parcalar.push(form.siparisTarihi);
  return `${parcalar.join("_")}.${uzanti}`;
}
