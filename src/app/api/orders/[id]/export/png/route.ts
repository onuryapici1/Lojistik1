import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";
import { renderOrderPng } from "@/lib/render";
import { getOrder } from "@/lib/orders";
import { contentDispositionHeader } from "@/lib/contentDisposition";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const authToken = request.cookies.get(AUTH_COOKIE)?.value;
  if (!authToken) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const png = await renderOrderPng(request.nextUrl.origin, id, authToken);
  const fileName = `malzeme-siparis-${order.sube || id}.png`.replace(/\s+/g, "-");

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": contentDispositionHeader(fileName),
    },
  });
}
