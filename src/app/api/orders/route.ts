import { NextRequest, NextResponse } from "next/server";
import { listOrders, saveOrder } from "@/lib/orders";
import type { OrderData } from "@/lib/types";

export async function GET() {
  const orders = await listOrders();
  return NextResponse.json({ orders });
}

export async function POST(request: NextRequest) {
  const data = (await request.json()) as OrderData;
  if (!data || !Array.isArray(data.items)) {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
  }
  const id = await saveOrder({ ...data, id: undefined });
  return NextResponse.json({ id });
}
