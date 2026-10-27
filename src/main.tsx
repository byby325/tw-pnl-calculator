import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { notifyAppReady } from './lib/updater'

// 必須在任何網路請求之前呼叫：原生層若在逾時內沒收到，會判定這份 bundle 壞掉
// 並自動回滾到上一版（見 lib/updater.ts）。
notifyAppReady()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
