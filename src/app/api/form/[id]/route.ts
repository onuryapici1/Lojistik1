import { NextResponse } from "next/server";
import { formGetir, formGuncelle, formSil, formuDogrula } from "@/lib/depo";

type Baglam = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Baglam) {
  const { id } = await params;
  try {
    const form = await formGetir(id);
    if (!form) return NextResponse.json({ hata: "Form bulunamadı" }, { status: 404 });
    return NextResponse.json({ form });
  } catch (e) {
    return NextResponse.json({ hata: (e as Error).message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Baglam) {
  const { id } = await params;

  let ham: unknown;
  try {
    ham = await request.json();
  } catch {
    return NextResponse.json({ hata: "Geçersiz istek" }, { status: 400 });
  }

  const sonuc = formuDogrula(ham);
  if ("hata" in sonuc) return NextResponse.json({ hata: sonuc.hata }, { status: 400 });

  try {
    const form = await formGuncelle(id, sonuc.form);
    if (!form) return NextResponse.json({ hata: "Form bulunamadı" }, { status: 404 });
    return NextResponse.json({ form });
  } catch (e) {
    return NextResponse.json({ hata: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Baglam) {
  const { id } = await params;
  const silindi = await formSil(id);
  if (!silindi) return NextResponse.json({ hata: "Form bulunamadı" }, { status: 404 });
  return NextResponse.json({ tamam: true });
}
