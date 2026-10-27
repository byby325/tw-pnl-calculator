import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const MIS_ORIGIN = 'https://mis.twse.com.tw'

export default defineConfig({
  // Capacitor 以 file:// 載入打包後的網頁，資源必須用相對路徑。
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'dist' },
  server: {
    // 證交所不回 CORS header，所以 npm run dev 時瀏覽器直接打會失敗。
    // 開發階段改由 dev server 代打，正式 APK 走 CapacitorHttp 的原生層（ADR-0011）。
    proxy: {
      '/mis': {
        target: MIS_ORIGIN,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mis/, ''),
        headers: { Referer: `${MIS_ORIGIN}/stock/index.jsp` },
      },
    },
  },
})
