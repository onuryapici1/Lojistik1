import { NextResponse } from "next/server";
import { cerezAyarlari, jetonUret, OTURUM_COOKIE, sifreDogruMu } from "@/lib/auth";

/** Basit hız sınırı: aynı IP'den arka arkaya deneme yapılmasını yavaşlatır. */
const denemeler = new Map<string, { sayi: number; sifirlama: number }>();
const PENCERE_MS = 60_000;
const EN_FAZLA_DENEME = 10;

function cokFazlaDenemeVarMi(ip: string): boolean {
  const simdi = Date.now();
  const kayit = denemeler.get(ip);
  if (!kayit || kayit.sifirlama < simdi) {
    denemeler.set(ip, { sayi: 1, sifirlama: simdi + PENCERE_MS });
    return false;
  }
  kayit.sayi += 1;
  return kayit.sayi > EN_FAZLA_DENEME;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "bilinmiyor";
  if (cokFazlaDenemeVarMi(ip)) {
    return NextResponse.json(
      { hata: "Çok fazla deneme yapıldı. Bir dakika sonra tekrar deneyin." },
      { status: 429 },
    );
  }

  let sifre = "";
  try {
    const govde = await request.json();
    sifre = typeof govde?.sifre === "string" ? govde.sifre : "";
  } catch {
    return NextResponse.json({ hata: "Geçersiz istek" }, { status: 400 });
  }

  if (!sifre) {
    return NextResponse.json({ hata: "Şifre girin" }, { status: 400 });
  }

  try {
    if (!sifreDogruMu(sifre)) {
      return NextResponse.json({ hata: "Şifre hatalı" }, { status: 401 });
    }
  } catch (e) {
    // SITE_PASSWORD / AUTH_SECRET eksikse kullanıcıya net söyle.
    return NextResponse.json({ hata: (e as Error).message }, { status: 500 });
  }

  const yanit = NextResponse.json({ tamam: true });
  yanit.cookies.set(OTURUM_COOKIE, await jetonUret(), cerezAyarlari());
  return yanit;
}
