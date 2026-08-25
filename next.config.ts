import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDF üretimi Noto Sans dosyalarını çalışma anında diskten okuyor; Vercel'in
  // dosya izleyicisi bunları tek başına bulamadığı için elle belirtiyoruz.
  outputFileTracingIncludes: {
    "/api/cikti/pdf": ["./src/assets/fonts/**"],
  },
};

export default nextConfig;
