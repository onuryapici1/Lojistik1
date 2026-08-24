"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import type { OrderData, OrderItemData, PageMode } from "@/lib/types";
import { emptyItem } from "@/lib/types";
import { paginate } from "@/lib/pagination";
import { ItemRow } from "@/components/ItemRow";
import { GeminiPanel } from "@/components/GeminiPanel";
import { PageSettingsPanel } from "@/components/PageSettingsPanel";
import { PreviewPanel } from "@/components/PreviewPanel";

export function OrderEditor({ initial }: { initial: OrderData }) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderData>(initial);
  const [savedId, setSavedId] = useState<string | undefined>(initial.id);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const pagination = useMemo(
    () => paginate(order.items, order.pageMode, order.splitCount, order.scale),
    [order.items, order.pageMode, order.splitCount, order.scale]
  );

  function mutate(updater: (draft: OrderData) => OrderData) {
    setOrder((prev) => updater(prev));
    setDirty(true);
    setSaveMessage("");
  }

  function updateField(field: "sube" | "siparisTarihi" | "teslimTarihi", value: string) {
    mutate((prev) => ({ ...prev, [field]: value }));
  }

  function handleItemChange(id: string, field: keyof OrderItemData, value: string) {
    mutate((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, [field]: value } : it)),
    }));
  }

  function handleDelete(id: string) {
    mutate((prev) => ({ ...prev, items: prev.items.filter((it) => it.id !== id) }));
  }

  function handleInsertAfter(id: string) {
    mutate((prev) => {
      const idx = prev.items.findIndex((it) => it.id === id);
      const items = [...prev.items];
      items.splice(idx + 1, 0, emptyItem());
      return { ...prev, items };
    });
  }

  function handleAddAtEnd() {
    mutate((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  }

  function handleGeminiItems(newItems: Omit<OrderItemData, "id">[]) {
    mutate((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        ...newItems.map((it) => ({ ...it, id: crypto.randomUUID() })),
      ],
    }));
  }

  function handleModeChange(mode: PageMode) {
    mutate((prev) => ({ ...prev, pageMode: mode }));
  }

  function handleSplitCountChange(count: number) {
    mutate((prev) => ({ ...prev, splitCount: count }));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    mutate((prev) => {
      const oldIndex = prev.items.findIndex((it) => it.id === active.id);
      const newIndex = prev.items.findIndex((it) => it.id === over.id);
      return { ...prev, items: arrayMove(prev.items, oldIndex, newIndex) };
    });
  }

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    setSaveMessage("");
    try {
      const payload: OrderData = { ...order, scale: pagination.scale };
      const res = await fetch(savedId ? `/api/orders/${savedId}` : "/api/orders", {
        method: savedId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "Kaydedilemedi");
        return;
      }
      setSavedId(data.id);
      setDirty(false);
      setSaveMessage("Kaydedildi ✓");
      if (!order.id) {
        router.replace(`/siparis/${data.id}`);
      }
    } catch {
      setSaveError("Bağlantı hatası, tekrar deneyin");
    } finally {
      setSaving(false);
    }
  }

  const exportDisabled = !savedId || dirty;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
          <h2 className="font-semibold text-slate-800">Sipariş Bilgileri</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="text-sm text-slate-600 space-y-1">
              <span>Şube</span>
              <input
                type="text"
                value={order.sube}
                onChange={(e) => updateField("sube", e.target.value)}
                placeholder="Örn: Merkez Şube"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="text-sm text-slate-600 space-y-1">
              <span>Sipariş Tarihi</span>
              <input
                type="date"
                value={order.siparisTarihi}
                onChange={(e) => updateField("siparisTarihi", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="text-sm text-slate-600 space-y-1">
              <span>Teslim Tarihi</span>
              <input
                type="date"
                value={order.teslimTarihi}
                onChange={(e) => updateField("teslimTarihi", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        <GeminiPanel onItemsReady={handleGeminiItems} />

        <PageSettingsPanel
          pageMode={order.pageMode}
          splitCount={order.splitCount}
          pageCount={pagination.pageCount}
          effectiveScale={pagination.scale}
          onModeChange={handleModeChange}
          onSplitCountChange={handleSplitCountChange}
        />

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Malzeme Listesi ({order.items.length})</h2>
            <button
              type="button"
              onClick={handleAddAtEnd}
              className="rounded-lg bg-slate-800 text-white text-sm font-medium px-3 py-2 hover:bg-slate-900"
            >
              + Sona Satır Ekle
            </button>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={order.items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {order.items.map((item, index) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    index={index}
                    onChange={handleItemChange}
                    onDelete={handleDelete}
                    onInsertAfter={handleInsertAfter}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {order.items.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-6">Henüz malzeme eklenmedi.</p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-blue-600 text-white font-medium px-5 py-2.5 hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
            {saveMessage && <span className="text-sm text-green-600">{saveMessage}</span>}
            {saveError && <span className="text-sm text-red-600">{saveError}</span>}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={exportDisabled ? undefined : `/api/orders/${savedId}/export/xlsx`}
              aria-disabled={exportDisabled}
              className={`rounded-lg px-4 py-2 text-sm font-medium border ${
                exportDisabled
                  ? "border-slate-200 text-slate-400 cursor-not-allowed"
                  : "border-emerald-600 text-emerald-700 hover:bg-emerald-50"
              }`}
              title={exportDisabled ? "Önce kaydedin" : "Excel olarak indir"}
            >
              📊 Excel indir
            </a>
            <a
              href={exportDisabled ? undefined : `/api/orders/${savedId}/export/pdf`}
              aria-disabled={exportDisabled}
              className={`rounded-lg px-4 py-2 text-sm font-medium border ${
                exportDisabled
                  ? "border-slate-200 text-slate-400 cursor-not-allowed"
                  : "border-red-600 text-red-700 hover:bg-red-50"
              }`}
              title={exportDisabled ? "Önce kaydedin" : "PDF olarak indir"}
            >
              📄 PDF indir
            </a>
            <a
              href={exportDisabled ? undefined : `/api/orders/${savedId}/export/png`}
              aria-disabled={exportDisabled}
              className={`rounded-lg px-4 py-2 text-sm font-medium border ${
                exportDisabled
                  ? "border-slate-200 text-slate-400 cursor-not-allowed"
                  : "border-purple-600 text-purple-700 hover:bg-purple-50"
              }`}
              title={exportDisabled ? "Önce kaydedin" : "PNG olarak indir"}
            >
              🖼️ PNG indir
            </a>
          </div>
          {exportDisabled && (
            <p className="text-xs text-slate-500 mt-2">
              Excel/PDF/PNG indirmek için önce &quot;Kaydet&quot; butonuna basın.
            </p>
          )}
        </div>
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start space-y-2">
        <h2 className="font-semibold text-slate-800 px-1">Önizleme (A4)</h2>
        <PreviewPanel order={order} />
      </div>
    </div>
  );
}
