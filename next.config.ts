import type { NextConfig } from "next";

// cacheComponents sengaja mati: app ini dinamis per pengguna (sesi Supabase membaca cookie) dan tidak memakai cache.
// Jika dinyalakan, setiap halaman yang membaca cookies/params wajib dibungkus <Suspense>, dan state halaman lama ikut tersimpan.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
