import { NextResponse } from "next/server";
import { formuDogrula } from "@/lib/depo";
import { cizimUret } from "@/lib/cizim";
import { pdfUret } from "@/lib/cizim-pdf";

import { indirmeBasligi, dosyaAdi } from "@/lib/indirme";

// Font gömme ve çok sayfalı çizim birkaç saniye sürebiliyor.
export const maxDuration = 30;

export async function POST(request: Request) {
  let ham: unknown;
  try {
    ham = await request.json();
  } catch {
    return NextResponse.json({ hata: "Geçersiz istek" }, { status: 400 });
  }

  const sonuc = formuDogrula(ham);
  if ("hata" in sonuc) return NextResponse.json({ hata: sonuc.hata }, { status: 400 });

  try {
    const cizim = cizimUret(sonuc.form);
    const bayt = await pdfUret(cizim);
    return new NextResponse(bayt as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": indirmeBasligi(dosyaAdi(sonuc.form, "pdf")),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json({ hata: `PDF üretilemedi: ${(e as Error).message}` }, { status: 500 });
  }
}
