"use client";

import { emptyOrder } from "@/lib/types";
import { OrderEditor } from "@/components/OrderEditor";
import { TopBar } from "@/components/TopBar";

export default function YeniSiparisPage() {
  return (
    <>
      <TopBar title="Yeni Sipariş" />
      <main className="max-w-6xl mx-auto w-full px-4 py-6">
        <OrderEditor initial={emptyOrder()} />
      </main>
    </>
  );
}
