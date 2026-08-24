import { notFound } from "next/navigation";
import { getOrder } from "@/lib/orders";
import { OrderPrintPages } from "@/components/OrderPrintPages";

export default async function YazdirPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  return (
    <div className="bg-slate-300 py-[6mm] min-h-screen print:bg-white print:p-0 print:min-h-0">
      <OrderPrintPages order={order} />
    </div>
  );
}
