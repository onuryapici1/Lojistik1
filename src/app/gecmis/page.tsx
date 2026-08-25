import Link from "next/link";
import { formlariListele } from "@/lib/depo";
import { GecmisListesi } from "@/components/GecmisListesi";

export const dynamic = "force-dynamic";

export default async function GecmisSayfasi() {
  const formlar = await formlariListele();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 h-14 flex items-center gap-2">
          <h1 className="font-bold text-slate-900">Geçmiş formlar</h1>
          <Link
            href="/"
            className="ml-auto rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700"
          >
            Yeni form
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-3 sm:px-4 py-4">
        <GecmisListesi formlar={formlar} />
      </main>
    </div>
  );
}
