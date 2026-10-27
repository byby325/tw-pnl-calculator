---
status: accepted
---

# 零後端：行情請求由 Capacitor 的原生 HTTP 直接發出

ADR-0005 認定必須自建報價 proxy，理由是實測證實瀏覽器拿不到行情 —— 從 `https://example.com` 跨網域 fetch 證交所與櫃買中心的 openapi 與 MIS 三個端點全部 `TypeError: Failed to fetch`，伺服器端 curl 則都回 200 且回應裡沒有 `Access-Control-Allow-Origin`。那個結論在「交付物包含網頁版」的前提下是對的。

改為只交付 APK（ADR-0003）之後前提消失了。Capacitor 的 `CapacitorHttp` 會把 `fetch` 與 `XMLHttpRequest` 轉由原生 HTTP 函式庫發出（在 Capacitor 設定檔的 `plugins` 底下設 `CapacitorHttp: { enabled: true }`，預設關閉）。原生 HTTP 沒有 CORS 這個概念，也沒有瀏覽器對 `Referer` 的限制 —— 而 MIS 正好必須帶 `Referer: https://mis.twse.com.tw/stock/index.jsp` 才會回應。因此 app 可以直接打行情來源，不需要任何伺服器。

結果是沒有後端、沒有資料庫、沒有部署、沒有雲端費用，整個專案就是一個 APK。

代價與已知限制：行情來源的網址寫死在 APK 裡，來源變動就得重新發版；patching 是全域生效，無法只套用在部分請求；`EventSource` 不走這條路（本專案用不到）；官方文件提醒大量資料跨 bridge 傳輸可能有問題，所以股票代號字典改為建置時打包進 APK，執行期只取單檔報價，避免一次搬運整包全市場收盤資料。

## 實機驗證（2026-10-27）

這份決策一度只是賭注：文件與社群說法都支持 `CapacitorHttp` 會繞過 CORS，但在真機上跑之前沒有證據，而整個零後端架構完全押在它身上。debug APK 裝到實機後查詢台股，成功取得即時報價 —— 原生層確實不受 CORS 限制，也確實送得出證交所 MIS 要求的 `Referer`。

因此 ADR-0005（薄後端報價 proxy）不再是備案，本專案確定不需要任何伺服器。那份文件仍保留全文，因為它的推論在「交付物包含網頁版」的前提下依然正確 —— 一旦未來要做網頁版，proxy 就會重新變成必要。
