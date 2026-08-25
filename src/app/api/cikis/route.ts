import { NextResponse } from "next/server";
import { cerezAyarlari, OTURUM_COOKIE } from "@/lib/auth";

export async function POST() {
  const yanit = NextResponse.json({ tamam: true });
  yanit.cookies.set(OTURUM_COOKIE, "", cerezAyarlari(true));
  return yanit;
}
