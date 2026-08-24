import type { OrderData, OrderItemData } from "@/lib/types";
import { paginate, BASE_ROW_HEIGHT_MM, BASE_FONT_MM, A4_WIDTH_MM, A4_HEIGHT_MM, PAGE_MARGIN_MM } from "@/lib/pagination";

function ColumnBlock({
  items,
  rowHeightMm,
  fontSizeMm,
  startIndex,
}: {
  items: OrderItemData[];
  rowHeightMm: number;
  fontSizeMm: number;
  startIndex: number;
}) {
  return (
    <table
      className="w-full border-collapse"
      style={{ tableLayout: "fixed", fontSize: `${fontSizeMm}mm`, lineHeight: 1.15 }}
    >
      <colgroup>
        <col style={{ width: "9%" }} />
        <col style={{ width: "50%" }} />
        <col style={{ width: "16%" }} />
        <col style={{ width: "25%" }} />
      </colgroup>
      <thead>
        <tr>
          <th className="border border-black bg-slate-200 font-bold py-[0.4mm] overflow-hidden">Sıra</th>
          <th className="border border-black bg-slate-200 font-bold py-[0.4mm] overflow-hidden">Malzeme Adı</th>
          <th className="border border-black bg-slate-200 font-bold py-[0.4mm] overflow-hidden">Miktar</th>
          <th className="border border-black bg-slate-200 font-bold py-[0.4mm] overflow-hidden">Stok Durumu</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr key={item.id} style={{ height: `${rowHeightMm}mm` }}>
            <td className="border border-black text-center overflow-hidden">{startIndex + i + 1}</td>
            <td className="border border-black px-[1mm] truncate overflow-hidden">{item.malzemeAdi}</td>
            <td className="border border-black text-center overflow-hidden">{item.miktar}</td>
            <td className="border border-black text-center overflow-hidden">{item.stokDurumu}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function OrderPrintPages({ order }: { order: OrderData }) {
  const result = paginate(order.items, order.pageMode, order.splitCount, order.scale);
  const rowHeightMm = (BASE_ROW_HEIGHT_MM * result.scale) / 100;
  const fontSizeMm = (BASE_FONT_MM * result.scale) / 100;

  const pageStarts = result.pages.map((_, i) => {
    const base = result.pages.slice(0, i).reduce((sum, p) => sum + p[0].length + p[1].length, 0);
    return { left: base, right: base + result.pages[i][0].length };
  });

  return (
    <div id="print-root">
      {result.pages.map((page, pageIndex) => {
        const [left, right] = page;
        const leftStart = pageStarts[pageIndex].left;
        const rightStart = pageStarts[pageIndex].right;

        return (
          <div
            key={pageIndex}
            className="print-page bg-white text-black"
            style={{
              width: `${A4_WIDTH_MM}mm`,
              height: `${A4_HEIGHT_MM}mm`,
              padding: `${PAGE_MARGIN_MM}mm`,
              boxSizing: "border-box",
              pageBreakAfter: pageIndex < result.pages.length - 1 ? "always" : "auto",
              fontFamily: "Arial, Helvetica, sans-serif",
              overflow: "hidden",
            }}
          >
            {pageIndex === 0 && (
              <div className="mb-[3mm]">
                <h1 className="text-center text-[5mm] font-bold border-2 border-black py-[1.5mm] mb-[2mm]">
                  MALZEME SİPARİŞ FORMU
                </h1>
                <div className="flex justify-between text-[3.3mm] gap-[3mm]">
                  <div className="flex-1 border border-black px-[2mm] py-[1mm]">
                    <span className="font-bold">ŞUBE: </span>
                    {order.sube}
                  </div>
                  <div className="flex-1 border border-black px-[2mm] py-[1mm]">
                    <span className="font-bold">SİPARİŞ TARİHİ: </span>
                    {order.siparisTarihi}
                  </div>
                  <div className="flex-1 border border-black px-[2mm] py-[1mm]">
                    <span className="font-bold">TESLİM TARİHİ: </span>
                    {order.teslimTarihi}
                  </div>
                </div>
              </div>
            )}
            {result.pages.length > 1 && (
              <div className="text-right text-[2.6mm] mb-[1mm] text-slate-500">
                Sayfa {pageIndex + 1} / {result.pages.length}
              </div>
            )}
            <div className="flex gap-[3mm]">
              <div className="flex-1">
                <ColumnBlock items={left} rowHeightMm={rowHeightMm} fontSizeMm={fontSizeMm} startIndex={leftStart} />
              </div>
              <div className="flex-1">
                <ColumnBlock items={right} rowHeightMm={rowHeightMm} fontSizeMm={fontSizeMm} startIndex={rightStart} />
              </div>
            </div>
            {pageIndex === result.pages.length - 1 && (
              <div className="mt-[3mm] text-[2.6mm] text-slate-600 leading-[4mm]">
                <div className="font-bold">KULLANIM NOTU</div>
                <div>• Miktar: sayı olarak girilir (ör. 10). Stok Durumu: Var / Az / Yok şeklinde yazılır.</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
