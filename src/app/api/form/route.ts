import { NextResponse } from "next/server";
import { formOlustur, formlariListele, formuDogrula } from "@/lib/depo";

export async function GET() {
  try {
    return NextResponse.json({ formlar: await formlariListele() });
  } catch (e) {
    return NextResponse.json({ hata: (e as Error).message }, { status: 500 });
  }
}

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
    return NextResponse.json({ form: await formOlustur(sonuc.form) }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ hata: (e as Error).message }, { status: 500 });
  }
}
