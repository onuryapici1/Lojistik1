"use client";

import { useEffect, useRef, useState } from "react";
import type { OrderData } from "@/lib/types";
import { OrderPrintPages } from "@/components/OrderPrintPages";
import { A4_WIDTH_MM } from "@/lib/pagination";

const MM_TO_PX = 3.7795275591; // 96dpi

export function PreviewPanel({ order }: { order: OrderData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  const [naturalHeight, setNaturalHeight] = useState(0);

  useEffect(() => {
    function update() {
      if (!containerRef.current || !contentRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const pageWidthPx = A4_WIDTH_MM * MM_TO_PX;
      setScale(Math.min(1, containerWidth / pageWidthPx));
      setNaturalHeight(contentRef.current.scrollHeight);
    }
    update();
    const observer = new ResizeObserver(update);
    if (containerRef.current) observer.observe(containerRef.current);
    if (contentRef.current) observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [order]);

  return (
    <div className="bg-slate-100 border border-slate-200 rounded-xl p-3">
      <div ref={containerRef} className="w-full" style={{ height: naturalHeight * scale }}>
        <div
          ref={contentRef}
          style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: `${A4_WIDTH_MM * MM_TO_PX}px` }}
        >
          <OrderPrintPages order={order} />
        </div>
      </div>
    </div>
  );
}
