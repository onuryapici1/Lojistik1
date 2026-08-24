import { notFound } from "next/navigation";
import { getOrder } from "@/lib/orders";
import { OrderEditor } from "@/components/OrderEditor";
import { TopBar } from "@/components/TopBar";

export default async function SiparisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  return (
    <>
      <TopBar title={order.sube || "Sipariş"} />
      <main className="max-w-6xl mx-auto w-full px-4 py-6">
        <OrderEditor initial={order} />
      </main>
    </>
  );
}
