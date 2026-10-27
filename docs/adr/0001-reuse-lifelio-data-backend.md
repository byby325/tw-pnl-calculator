---
status: superseded by ADR-0002
---

# 沿用 lifelio 的資料後端，不自建行情與帳本層

這個投資 side project 需要的市場資料層（Yahoo Finance / Finnhub / TWSE / TPEx 報價、匯率、籌碼、情緒指標、新聞）與交易帳本（持股、TWR/XIRR、對帳單匯入）在 lifelio（`life-dashboard-api`）裡已經是跑在 production 的東西，重寫一次只會重複最髒也最不穩定的那段工（Yahoo crumb cookie、TWSE 三套不同 endpoint、代號解析、交易所時區）。因此決定把 lifelio 當成本專案的 market data 與 portfolio 後端，新專案只做上層的全新題目。

代價：本專案被 lifelio 的 MongoDB schema 與單一使用者假設綁住，且 lifelio 多條資料來源是非官方爬法，上游壞掉時本專案會一起壞。
