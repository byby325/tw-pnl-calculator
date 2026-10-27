---
status: accepted
---

# 前端用 Vite + React，APK 用 Capacitor 打包

對照過兩條產 APK 的路：PWABuilder 產 TWA 幾分鐘就好、完全不需要本機 Android SDK，但 TWA 本質上是一個指向線上網站的全螢幕 Chrome，網路一斷就是白畫面。Capacitor 則把建置好的網頁檔案打包進 APK，離線仍然開得起來（只是取不到即時報價）。對一個只服務課堂 demo 的專案（ADR-0006），教室網路出問題的機率高於程式本身出錯，所以選 Capacitor。

Vite + React 是因為 lifelio 的 `life-dashboard-web` 正好同一套（Vite + React 19 + Tailwind + Radix + recharts），Dashboard 與持股明細的元件可以直接拿來改。

代價：需要 Android SDK 才能 build APK，本機目前沒有，要裝 Android Studio 或改用 CI 在雲端 build。
