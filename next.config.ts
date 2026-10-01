import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Las pruebas de navegador construyen en su propia carpeta (ver
  // playwright.config.ts): Next no deja correr dos `next dev` sobre la misma,
  // y así `npm run test:e2e` funciona aunque haya un `npm run dev` abierto.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
