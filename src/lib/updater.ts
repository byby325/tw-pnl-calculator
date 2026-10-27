import { CapacitorUpdater } from '@capgo/capacitor-updater'
import { Capacitor } from '@capacitor/core'

/**
 * OTA 熱更新：app 在背景下載新的網頁 bundle，使用者下次開啟就是新版，不必重裝 APK。
 *
 * 只能更新網頁層。原生層的改動（新增外掛、改權限、升 Capacitor 版本）熱更新救不了，
 * 那種情況仍然要重新發佈 APK。
 *
 * 來源是一份靜態 manifest，沒有伺服器端邏輯，ADR-0011 的零後端仍然成立。
 */
const MANIFEST_URL = import.meta.env.VITE_OTA_MANIFEST_URL as string | undefined

interface Manifest {
    /** 最新的網頁 bundle 版本，例如 1.1.0。 */
    version: string
    /** 該版本 zip 的完整網址，必須是 HTTPS。 */
    url: string
}

export type UpdateState =
    | { status: 'idle' }
    | { status: 'downloading' }
    | { status: 'ready'; version: string }

/**
 * 把 1.2.10 這種版本字串拆成數字比大小，避免字典序把 1.2.10 判成小於 1.2.9。
 * 解析不出數字的段落當成 0，這樣即使拿到非版號字串也只會多更新一次就自我修正，
 * 不會卡死在永遠不更新。
 */
function isNewer(candidate: string, current: string): boolean {
    const toParts = (v: string) => v.split('.').map((seg) => Number.parseInt(seg, 10) || 0)
    const a = toParts(candidate)
    const b = toParts(current)
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const x = a[i] ?? 0
        const y = b[i] ?? 0
        if (x !== y) return x > y
    }
    return false
}

/**
 * 告訴原生層這份 bundle 的 JavaScript 跑起來了。
 *
 * 每次啟動都必須呼叫，而且要在任何網路請求之前 —— 預設 10 秒內沒收到就會判定這份
 * bundle 壞掉並自動回滾到上一版。這是 OTA 推壞版本時的保險，不能省。
 */
export function notifyAppReady(): void {
    if (!Capacitor.isNativePlatform()) return
    void CapacitorUpdater.notifyAppReady()
}

/**
 * 檢查有沒有新版，有就下載並排進下次啟動。全程失敗都只是靜靜地不更新，
 * 絕不能影響使用者正在做的計算。
 */
export async function checkForUpdate(
    onState: (state: UpdateState) => void,
): Promise<void> {
    if (!Capacitor.isNativePlatform() || !MANIFEST_URL) return

    try {
        const res = await fetch(`${MANIFEST_URL}?t=${Date.now()}`)
        if (!res.ok) return
        const manifest = (await res.json()) as Manifest
        if (!manifest?.version || !manifest?.url) return

        const current = await CapacitorUpdater.current()
        // 還沒套用過任何更新時 bundle.id 會是 'builtin'，此時 bundle.version 不保證是
        // 版號，要改用 native（APK 的 versionName）當比較基準。
        const installed = current.bundle.id === 'builtin' ? current.native : current.bundle.version
        if (!isNewer(manifest.version, installed)) return

        onState({ status: 'downloading' })
        const bundle = await CapacitorUpdater.download({
            url: manifest.url,
            version: manifest.version,
        })

        // next 是「下次啟動才生效」；set 會當場重載並摧毀現在的 JS context，
        // 使用者填到一半的批次會整個消失，所以這裡不能用 set。
        await CapacitorUpdater.next({ id: bundle.id })
        onState({ status: 'ready', version: manifest.version })
    } catch {
        onState({ status: 'idle' })
    }
}

/**
 * 目前實際在跑的網頁 bundle 版本。還沒套用過更新時回傳 APK 的 versionName。
 * 網頁版沒有版本概念，回 null。
 */
export async function getRunningVersion(): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) return null
    try {
        const current = await CapacitorUpdater.current()
        return current.bundle.id === 'builtin' ? current.native : current.bundle.version
    } catch {
        return null
    }
}
