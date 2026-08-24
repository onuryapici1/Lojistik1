"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { OrderItemData } from "@/lib/types";

const STOK_OPTIONS = ["", "Var", "Az", "Yok"];

interface Props {
  item: OrderItemData;
  index: number;
  onChange: (id: string, field: keyof OrderItemData, value: string) => void;
  onDelete: (id: string) => void;
  onInsertAfter: (id: string) => void;
}

export function ItemRow({ item, index, onChange, onDelete, onInsertAfter }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white border border-slate-200 rounded-xl p-3 shadow-sm"
    >
      <div className="flex items-center gap-2 sm:w-auto">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 px-1 touch-none select-none"
          aria-label="Sürükle"
          title="Sürükleyerek sırala"
        >
          ⠿
        </button>
        <span className="text-xs font-semibold text-slate-400 w-6 text-center shrink-0">{index + 1}</span>
      </div>

      <input
        type="text"
        value={item.malzemeAdi}
        onChange={(e) => onChange(item.id, "malzemeAdi", e.target.value)}
        placeholder="Malzeme adı"
        className="flex-1 min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={item.miktar}
          onChange={(e) => onChange(item.id, "miktar", e.target.value)}
          placeholder="Miktar"
          className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <select
          value={item.stokDurumu}
          onChange={(e) => onChange(item.id, "stokDurumu", e.target.value)}
          className="w-24 rounded-lg border border-slate-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STOK_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt || "—"}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-1 justify-end sm:justify-start">
        <button
          type="button"
          onClick={() => onInsertAfter(item.id)}
          title="Bu satırın altına satır ekle"
          className="text-blue-600 hover:bg-blue-50 rounded-lg px-2 py-1 text-sm font-medium"
        >
          + Satır
        </button>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          title="Satırı sil"
          className="text-red-500 hover:bg-red-50 rounded-lg px-2 py-1 text-sm font-medium"
        >
          Sil
        </button>
      </div>
    </div>
  );
}
