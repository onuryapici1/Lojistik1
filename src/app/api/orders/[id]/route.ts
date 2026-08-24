import { NextRequest, NextResponse } from "next/server";
import { deleteOrder, getOrder, saveOrder } from "@/lib/orders";
import type { OrderData } from "@/lib/types";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json({ order });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = (await request.json()) as OrderData;
  if (!data || !Array.isArray(data.items)) {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
  }
  const savedId = await saveOrder({ ...data, id });
  return NextResponse.json({ id: savedId });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteOrder(id);
  return NextResponse.json({ ok: true });
}
