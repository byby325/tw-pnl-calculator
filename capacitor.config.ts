import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
    appId: 'com.dilly.twpnl',
    appName: '台股盈虧計算機',
    webDir: 'dist',
    plugins: {
        /*
         * 把 fetch 與 XMLHttpRequest 轉給原生 HTTP 發出。原生層沒有 CORS，也能自由
         * 設定 Referer —— 證交所 MIS 沒有 Referer 就不回應。這是整個零後端架構的前提
         * （ADR-0011），預設是關的，一定要明確打開。
         */
        CapacitorHttp: { enabled: true },
    },
    android: {
        // 離線時 WebView 仍然讀打包進 APK 的檔案，不會停在白畫面。
        webContentsDebuggingEnabled: true,
    },
}

export default config
