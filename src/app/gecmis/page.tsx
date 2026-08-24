import { listOrders } from "@/lib/orders";
import { OrderHistoryList } from "@/components/OrderHistoryList";
import { TopBar } from "@/components/TopBar";

export const dynamic = "force-dynamic";

export default async function GecmisPage() {
  const orders = await listOrders();

  return (
    <>
      <TopBar title="Geçmiş Siparişler" />
      <main className="max-w-4xl mx-auto w-full px-4 py-6 space-y-4">
        <h1 className="text-xl font-bold text-slate-800">Geçmiş Siparişler</h1>
        <OrderHistoryList
          orders={orders.map((o) => ({
            ...o,
            updatedAt: o.updatedAt.toISOString(),
          }))}
        />
      </main>
    </>
  );
}
