import { NextResponse } from "next/server";
import { formuDogrula } from "@/lib/depo";
import { xlsxUret } from "@/lib/xlsx";
import { indirmeBasligi, dosyaAdi } from "@/lib/indirme";

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
    const bayt = await xlsxUret(sonuc.form);
    return new NextResponse(bayt as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": indirmeBasligi(dosyaAdi(sonuc.form, "xlsx")),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json({ hata: `Excel üretilemedi: ${(e as Error).message}` }, { status: 500 });
  }
}
