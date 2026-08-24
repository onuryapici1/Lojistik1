import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright-core", "@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/orders/[id]/export/pdf": ["./node_modules/@sparticuz/chromium/**"],
    "/api/orders/[id]/export/png": ["./node_modules/@sparticuz/chromium/**"],
  },
};

export default nextConfig;
