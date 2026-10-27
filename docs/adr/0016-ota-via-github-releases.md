---
status: accepted
---

# 以 OTA 熱更新取代商店的自動更新

不上架商店（ADR-0003）的代價是沒有自動更新：改一版就要請使用者重新下載並手動安裝 APK，實務上沒人會為了小改版做這件事。改用 OTA：app 啟動時向一份靜態 manifest 查版本，有新版就在背景下載網頁 bundle，排進下次啟動生效。

選 `next()` 而不是 `set()`。`set()` 會當場重載並摧毀現在的 JavaScript context，使用者填到一半的批次會整個消失；`next()` 只排程，下次開啟才換。

每次啟動都呼叫 `notifyAppReady()`，而且放在所有網路請求之前。原生層若在逾時內沒收到，會判定這份 bundle 壞掉並自動回滾到上一版 —— 這是推壞版本時唯一的保險。

版本比較以 `current()` 為準，但 `bundle.id` 為 `builtin`（尚未套用過任何更新）時 `bundle.version` 不保證是版號字串，必須改用 `native`。若直接拿 `bundle.version` 比較，解析成 NaN 會讓比較永遠為 false，全新安裝的裝置將永遠收不到更新，而且不會報錯、不會當掉，只會安靜地什麼都不做。

manifest 與 bundle 放 GitHub Releases，網址固定指向 `releases/latest`，所以發新版只要上傳資產，不必改網址也不必重出 APK。靜態檔案主機沒有伺服器端邏輯，ADR-0011 的零後端仍然成立；但這也表示 repo 必須是公開的，私有 repo 的 release 資產需要認證才能下載，而 app 無法安全地內嵌憑證。

天花板：只能更新網頁層。新增原生外掛、改權限、升 Capacitor 版本都救不了，那些仍然要重新發佈 APK。外掛本身也是原生層的東西，所以 1.0.0 之前安裝的版本收不到 OTA，必須手動重裝一次。

## 驗證狀態（2026-10-27）

伺服器端整條鏈已驗證：`releases/latest/download/version.json` 回 HTTP 200 且內容正確、它指向的 zip 下載得到、zip 根目錄有外掛要求的 `index.html`、新 bundle 裡確實含有該版新增的程式碼。

**尚未驗證的是裝置端**：app 是否真的會比對版本、下載、排程，並在下次啟動載入新 bundle。v1.0.1 刻意加了一個頁尾顯示目前執行的 bundle 版本作為訊號 —— 1.0.0 的 APK 沒有那個頁尾，所以頁尾出現且顯示 1.0.1 就代表熱更新生效。在實機上看到之前，這個機制的狀態等同 ADR-0011 驗證前的 CapacitorHttp：零件都對，但沒跑過。
