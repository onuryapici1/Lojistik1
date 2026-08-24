import Link from "next/link";
import { listOrders } from "@/lib/orders";
import { TopBar } from "@/components/TopBar";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const orders = await listOrders();
  const recent = orders.slice(0, 5);

  return (
    <>
      <TopBar title="Ana Sayfa" />
      <main className="max-w-4xl mx-auto w-full px-4 py-8 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-800">Özlem Malzeme Formu</h1>
          <p className="text-slate-500 mt-2">
            Şube malzeme sipariş formunu doldurun, Excel / PDF / PNG olarak indirin.
          </p>
          <Link
            href="/siparis/yeni"
            className="inline-block mt-5 rounded-xl bg-blue-600 text-white font-semibold px-6 py-3 hover:bg-blue-700"
          >
            + Yeni Sipariş Formu Doldur
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800">Son Siparişler</h2>
            <Link href="/gecmis" className="text-sm text-blue-700 hover:underline">
              Tümünü Gör
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-500">Henüz kaydedilmiş sipariş yok.</p>
          ) : (
            <div className="space-y-2">
              {recent.map((order) => (
                <Link
                  key={order.id}
                  href={`/siparis/${order.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-100 hover:border-slate-300 px-3 py-2"
                >
                  <span className="font-medium text-slate-700">{order.sube || "(Şube belirtilmemiş)"}</span>
                  <span className="text-xs text-slate-400">{order._count.items} malzeme</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
