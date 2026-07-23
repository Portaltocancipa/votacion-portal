import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Evita que el navegador cachee el HTML de las páginas (login,
        // admin) y sirva una versión vieja tras un deploy. Los archivos
        // dentro de _next/static sí llevan hash y pueden cachearse siempre.
        source: "/((?!_next/static).*)",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
