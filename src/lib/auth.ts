/**
 * Tek şifreli basit giriş.
 *
 * Kullanıcı adı yok: siteye girmek için tek bir SITE_PASSWORD var. Doğru şifre
 * girilince AUTH_SECRET ile imzalanmış bir çerez yazılır. İmza Web Crypto ile
 * yapılır, böylece hem Node hem de proxy (edge) çalışma ortamında çalışır.
 */

export const OTURUM_COOKIE = "ozlem_oturum";

/** Oturum süresi: 30 gün. */
export const OTURUM_SURESI_SN = 60 * 60 * 24 * 30;

function metniBayta(s: string): Uint8Array<ArrayBuffer> {
  // TextEncoder ArrayBufferLike döndürüyor; Web Crypto ise kesin ArrayBuffer istiyor.
  return new TextEncoder().encode(s) as Uint8Array<ArrayBuffer>;
}

function baytiBase64Url(bayt: ArrayBuffer): string {
  const bytes = new Uint8Array(bayt);
  let ikili = "";
  for (const b of bytes) ikili += String.fromCharCode(b);
  return btoa(ikili).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function gizliAnahtar(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    throw new Error("AUTH_SECRET tanımlı değil. Vercel > Settings > Environment Variables'a ekleyin.");
  }
  return s;
}

async function imzala(veri: string): Promise<string> {
  const anahtar = await crypto.subtle.importKey(
    "raw",
    metniBayta(gizliAnahtar()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const imza = await crypto.subtle.sign("HMAC", anahtar, metniBayta(veri));
  return baytiBase64Url(imza);
}

/** Zamanlama saldırısına kapalı karşılaştırma. */
function esitMi(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let fark = 0;
  for (let i = 0; i < a.length; i++) fark |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return fark === 0;
}

/** Girilen şifre doğru mu? */
export function sifreDogruMu(girilen: string): boolean {
  const dogru = process.env.SITE_PASSWORD;
  if (!dogru) {
    throw new Error("SITE_PASSWORD tanımlı değil. Vercel > Settings > Environment Variables'a ekleyin.");
  }
  return esitMi(girilen, dogru);
}

/** Çerezde saklanacak, süresi dolan imzalı jeton üretir. */
export function jetonUret(): Promise<string> {
  const sonGecerlilik = Date.now() + OTURUM_SURESI_SN * 1000;
  const govde = String(sonGecerlilik);
  return imzala(govde).then((imza) => `${govde}.${imza}`);
}

/** Jeton geçerli ve süresi dolmamış mı? */
export async function jetonGecerliMi(jeton: string | undefined): Promise<boolean> {
  if (!jeton) return false;
  const ayirac = jeton.lastIndexOf(".");
  if (ayirac <= 0) return false;

  const govde = jeton.slice(0, ayirac);
  const imza = jeton.slice(ayirac + 1);

  const sonGecerlilik = Number(govde);
  if (!Number.isFinite(sonGecerlilik) || sonGecerlilik < Date.now()) return false;

  try {
    return esitMi(await imzala(govde), imza);
  } catch {
    // AUTH_SECRET yoksa imza atılamaz; girişi reddet.
    return false;
  }
}

/** Set-Cookie başlığı için ortak ayarlar. */
export function cerezAyarlari(sil = false) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: sil ? 0 : OTURUM_SURESI_SN,
  };
}
