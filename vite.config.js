import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/Vocabulary/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // "prompt": khi có bản mới, app hiện thông báo để người dùng bấm cập nhật
      // (không tự reload giữa lúc đang ôn bài).
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["favicon.svg", "apple-touch-icon-180x180.png", "sounds/*.wav"],
      manifest: {
        name: "VocaLearn — Học từ vựng",
        short_name: "VocaLearn",
        description: "Học từ vựng tiếng Anh với flashcard, phát âm và ôn tập thông minh (FSRS).",
        lang: "vi",
        theme_color: "#7c5cff",
        background_color: "#f7f6ff",
        display: "standalone",
        orientation: "portrait",
        categories: ["education"],
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          { name: "Ôn tập hôm nay", short_name: "Ôn tập", url: "/Vocabulary/?tab=review", icons: [{ src: "pwa-192x192.png", sizes: "192x192" }] },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webp,wav,woff2}"],
        navigateFallback: "/Vocabulary/index.html",
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // CSS của Google Fonts
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-css" },
          },
          {
            // File font — gần như không đổi
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-files",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Dữ liệu từ vựng: ưu tiên mạng, mất mạng thì dùng bản cache gần nhất
            urlPattern: /^https:\/\/sheets\.googleapis\.com\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "vocab-sheet",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
