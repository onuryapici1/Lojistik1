import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Özlem Malzeme Formu",
  description: "Şube malzeme sipariş formu — Excel, PDF ve PNG çıktısı",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Kullanıcı yakınlaştırabilsin; erişilebilirlik için kapatmıyoruz.
  maximumScale: 5,
  themeColor: "#2563eb",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
