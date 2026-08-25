import { NextResponse, type NextRequest } from "next/server";
import { OTURUM_COOKIE, jetonGecerliMi } from "@/lib/auth";

/**
 * Giriş yapmamış kullanıcıyı /giris sayfasına yollar.
 * API isteklerinde yönlendirme yerine 401 döner ki istemci tarafı anlasın.
 */

const ACIK_YOLLAR = ["/giris", "/api/giris"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    ACIK_YOLLAR.includes(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const jeton = request.cookies.get(OTURUM_COOKIE)?.value;
  if (await jetonGecerliMi(jeton)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ hata: "Oturum gerekli" }, { status: 401 });
  }

  const hedef = new URL("/giris", request.url);
  if (pathname !== "/") hedef.searchParams.set("devam", pathname);
  return NextResponse.redirect(hedef);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
