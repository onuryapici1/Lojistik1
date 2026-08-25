import { Suspense } from "react";
import { GirisFormu } from "@/components/GirisFormu";

export default function GirisSayfasi() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <Suspense fallback={null}>
        <GirisFormu />
      </Suspense>
    </main>
  );
}
