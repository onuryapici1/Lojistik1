import { prisma } from "@/lib/prisma";
import type { OrderData, PageMode } from "@/lib/types";

export async function getOrder(id: string): Promise<OrderData | null> {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!order) return null;
  return {
    id: order.id,
    sube: order.sube,
    siparisTarihi: order.siparisTarihi,
    teslimTarihi: order.teslimTarihi,
    pageMode: order.pageMode as PageMode,
    splitCount: order.splitCount,
    scale: order.scale,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map((it) => ({
      id: it.id,
      malzemeAdi: it.malzemeAdi,
      miktar: it.miktar,
      stokDurumu: it.stokDurumu,
    })),
  };
}

export async function listOrders() {
  return prisma.order.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      sube: true,
      siparisTarihi: true,
      teslimTarihi: true,
      updatedAt: true,
      _count: { select: { items: true } },
    },
  });
}

export async function saveOrder(data: OrderData): Promise<string> {
  const items = data.items.filter((it) => it.malzemeAdi.trim().length > 0);

  if (data.id) {
    await prisma.order.update({
      where: { id: data.id },
      data: {
        sube: data.sube,
        siparisTarihi: data.siparisTarihi,
        teslimTarihi: data.teslimTarihi,
        pageMode: data.pageMode,
        splitCount: data.splitCount,
        scale: data.scale,
        items: {
          deleteMany: {},
          create: items.map((it, idx) => ({
            position: idx,
            malzemeAdi: it.malzemeAdi,
            miktar: it.miktar,
            stokDurumu: it.stokDurumu,
          })),
        },
      },
    });
    return data.id;
  }

  const created = await prisma.order.create({
    data: {
      sube: data.sube,
      siparisTarihi: data.siparisTarihi,
      teslimTarihi: data.teslimTarihi,
      pageMode: data.pageMode,
      splitCount: data.splitCount,
      scale: data.scale,
      items: {
        create: items.map((it, idx) => ({
          position: idx,
          malzemeAdi: it.malzemeAdi,
          miktar: it.miktar,
          stokDurumu: it.stokDurumu,
        })),
      },
    },
  });
  return created.id;
}

export async function deleteOrder(id: string) {
  await prisma.order.delete({ where: { id } });
}
