"use client";

import type { PageMode } from "@/lib/types";

interface Props {
  pageMode: PageMode;
  splitCount: number;
  pageCount: number;
  effectiveScale: number;
  onModeChange: (mode: PageMode) => void;
  onSplitCountChange: (count: number) => void;
}

export function PageSettingsPanel({
  pageMode,
  splitCount,
  pageCount,
  effectiveScale,
  onModeChange,
  onSplitCountChange,
}: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-800">📄 Sayfa Ayarı (A4)</span>
        <span className="text-sm font-medium text-blue-700 bg-blue-50 rounded-full px-3 py-1">
          {pageCount} sayfa · %{effectiveScale} boyut
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onModeChange("auto")}
          className={`rounded-lg px-3 py-2 text-sm font-medium border ${
            pageMode === "auto" ? "bg-blue-600 text-white border-blue-600" : "border-slate-300 text-slate-700"
          }`}
        >
          Otomatik
        </button>
        <button
          type="button"
          onClick={() => onModeChange("fit1")}
          className={`rounded-lg px-3 py-2 text-sm font-medium border ${
            pageMode === "fit1" ? "bg-blue-600 text-white border-blue-600" : "border-slate-300 text-slate-700"
          }`}
        >
          1 Sayfaya Sığdır
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onModeChange("splitN")}
            className={`rounded-lg px-3 py-2 text-sm font-medium border ${
              pageMode === "splitN" ? "bg-blue-600 text-white border-blue-600" : "border-slate-300 text-slate-700"
            }`}
          >
            Sayfaya Böl
          </button>
          {pageMode === "splitN" && (
            <input
              type="number"
              min={1}
              max={20}
              value={splitCount}
              onChange={(e) => onSplitCountChange(Math.max(1, Number(e.target.value) || 1))}
              className="w-16 rounded-lg border border-slate-300 px-2 py-2 text-sm text-center"
            />
          )}
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Otomatik: her sayfa dolduğunda yeni sayfa açılır. 1 Sayfaya Sığdır: yazı boyutu küçültülerek tüm liste tek
        A4&apos;e sıkıştırılır. Sayfaya Böl: belirttiğiniz sayfa sayısına eşit dağıtılır.
      </p>
    </div>
  );
}
