"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface OrderSummary {
  id: string;
  sube: string;
  siparisTarihi: string;
  teslimTarihi: string;
  updatedAt: string;
  _count: { items: number };
}

export function OrderHistoryList({ orders }: { orders: OrderSummary[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Bu siparişi silmek istediğinize emin misiniz?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/orders/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
        Henüz kaydedilmiş sipariş yok.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {orders.map((order) => (
        <div
          key={order.id}
          className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm"
        >
          <div className="min-w-0">
            <div className="font-semibold text-slate-800 truncate">{order.sube || "(Şube belirtilmemiş)"}</div>
            <div className="text-xs text-slate-500">
              Sipariş: {order.siparisTarihi || "-"} · Teslim: {order.teslimTarihi || "-"} · {order._count.items}{" "}
              malzeme
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/siparis/${order.id}`}
              className="rounded-lg bg-blue-600 text-white text-sm font-medium px-3 py-2 hover:bg-blue-700"
            >
              Aç / Düzenle
            </Link>
            <a
              href={`/api/orders/${order.id}/export/pdf`}
              className="rounded-lg border border-red-600 text-red-700 text-sm font-medium px-3 py-2 hover:bg-red-50"
            >
              PDF
            </a>
            <button
              onClick={() => handleDelete(order.id)}
              disabled={deletingId === order.id}
              className="rounded-lg border border-slate-300 text-slate-500 text-sm font-medium px-3 py-2 hover:bg-slate-50 disabled:opacity-50"
            >
              Sil
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
