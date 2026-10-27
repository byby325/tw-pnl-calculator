---
status: accepted
---

# 只交付 Android APK，不做 PWA、不上架商店、不做 iOS

這台開發機沒有 Xcode、沒有簽章憑證、沒有 Provisioning Profile，iOS 要從裝 Xcode 與 Apple Developer $99/年開始。Google Play 個人開發者帳號則有封測牆（封測 build 先過審、12 位測試者連續 opt-in 滿 14 天、再申請 production access 並再審一次），實務 3–4 週起跳，和短時間交付直接衝突。直接發佈 APK 讓這兩條時間成本同時歸零：不需要開發者帳號、不需要審核、不受 Google Play Minimum Functionality 與 Webview Spam 政策約束。

也一併放棄 PWA，只留 APK 一種交付物。放棄 PWA 的代價是失去「掃 QR 當場就能用」的零安裝 demo 路徑，換來的是整個專案只需要維護一份產物，而且解鎖了 ADR-0011 的零後端架構 —— APK 的 WebView 可以透過原生層發請求，不受 CORS 與 Referer 限制，網頁做不到。

代價：APK 要使用者自行允許「安裝未知來源的應用程式」，安裝時 Play Protect 會跳警告，沒有自動更新。這個決定也表示本專案不具備對一般大眾散佈的能力。
