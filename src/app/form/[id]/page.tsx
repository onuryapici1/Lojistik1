import { notFound } from "next/navigation";
import { FormDuzenleyici } from "@/components/FormDuzenleyici";
import { formGetir } from "@/lib/depo";

export const dynamic = "force-dynamic";

export default async function FormSayfasi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await formGetir(id);
  if (!form) notFound();
  return <FormDuzenleyici baslangic={form} />;
}
