---
status: accepted
---

# TA 改為多使用者，因此不沿用 lifelio 後端

課程題目定案為「輸入股票代號＋買入價＋數量，輸出盈虧」，且 TA 是「別人也可以用」。lifelio 是單人用的工具：它的 API 需要登入才能取用，資料模型也綁單一使用者，並沒有提供給匿名用戶端查詢個股報價的介面。要讓多使用者 app 靠它，等於在 lifelio 裡長出第二個產品，而不是沿用後端。因此推翻 ADR-0001，本專案自建後端。

lifelio 仍然有用的部分只剩可複製的程式碼：`lib/priceFetcher.ts`（`fetchPrice` / `fetchPriceBatch`，Yahoo + Finnhub + TWSE MIS + TPEx 多來源 fallback）與 `lib/symbolResolver.ts`（代號解析）。那是整個領域最髒的一段，用複製的，不要做成服務依賴。
