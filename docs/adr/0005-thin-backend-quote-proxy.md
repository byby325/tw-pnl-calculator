---
status: superseded by ADR-0011（已於實機驗證）
---


# 必須有一個薄後端當報價 proxy

一度考慮做成零後端的純靜態 PWA，但行不通。lifelio 的 `lib/priceFetcher.ts` 打 TWSE MIS 時必須帶 `Referer: https://mis.twse.com.tw/stock/index.jsp`，而瀏覽器禁止 JavaScript 設定 Referer；`lib/usHeatmap.ts` 要先向 `query2.finance.yahoo.com/v1/test/getcrumb` 取得 cookie crumb 再帶著查，跨網域 cookie 前端也做不到；Yahoo、TWSE、TPEx 三家都不回 CORS header。因此報價一定要由伺服器代打。

後端範圍限定為無狀態的報價代理（代號解析 + 多來源 fallback + 快取），不存使用者資料。副作用是：之後若要加 LLM，API key 本來就只能放伺服器端，而伺服器已經存在，等於零額外架構成本。
