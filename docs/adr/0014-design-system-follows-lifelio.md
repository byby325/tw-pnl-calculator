---
status: accepted
---

# 設計系統沿用 lifelio，字體打包進 APK 不走 CDN

介面風格要「沉穩」，而參照對象是 lifelio，所以直接讀它的 token 來對齊，不自己發明一套：shadcn neutral 色盤（灰階為主、深淺兩套）、`--radius: 8px`、`--spacing: 4px`、html 基準 14px、單一品牌綠 `oklch(0.62 0.13 145)`。排版沿用 Inter 內文、JetBrains Mono 數字（搭配 `tabular-nums`，報價更新時欄位不會左右跳動）、Source Serif 4 斜體標題。不用發光、漸層或高彩度色塊。

漲跌色維持台股習慣的漲紅跌綠，但彩度刻意壓低（`oklch(0.55 0.17 22)` 與 `oklch(0.56 0.13 155)`），和周圍的灰階共存而不刺眼。

字體以 `@fontsource-variable` 安裝並自行宣告 `@font-face`，只收 latin 子集。走 Google Fonts CDN 會讓 app 在離線時掉回系統字，和 ADR-0011 選 Capacitor 的理由（離線仍可開啟）衝突；只收 latin 是因為這三套字型本來就沒有中日韓字元，中文一定落到系統字，收 cyrillic 與 greek 只是讓 APK 變大。裁切後字體從 8 個檔約 350 KB 降到 3 個檔 140 KB。

淺色模式的次級文字從 lifelio 的 56% 亮度調深到 46.1%，次一級再調到 40%。原本的值在白底上只有約 3.3:1，12px 的提示文字達不到 WCAG AA 要求的 4.5:1。
