import { NextRequest, NextResponse } from "next/server";
import { getOrder } from "@/lib/orders";
import { buildOrderWorkbook } from "@/lib/exportXlsx";
import { contentDispositionHeader } from "@/lib/contentDisposition";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const buffer = await buildOrderWorkbook(order);
  const fileName = `malzeme-siparis-${order.sube || id}.xlsx`.replace(/\s+/g, "-");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": contentDispositionHeader(fileName),
    },
  });
}
