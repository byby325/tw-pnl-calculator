import type { Symbol } from './symbols'

/**
 * 最近查詢紀錄。純粹為了省去重複輸入，不是自選股也不是持股 —— 刪掉不影響任何
 * 計算結果（ADR-0012）。localStorage 在某些環境會直接拋錯，所有存取都要包住。
 */
const KEY = 'recent-symbols'
const MAX = 8

export function loadRecent(): Symbol[] {
    try {
        const raw = localStorage.getItem(KEY)
        if (!raw) return []
        const parsed: unknown = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        return parsed.filter(
            (s): s is Symbol =>
                !!s && typeof s.code === 'string' && typeof s.name === 'string' &&
                (s.market === 'tse' || s.market === 'otc'),
        ).slice(0, MAX)
    } catch {
        return []
    }
}

/** 把標的移到最前面；已經在清單裡就只是重新排序，不會變成兩筆。 */
export function pushRecent(symbol: Symbol): Symbol[] {
    const next = [symbol, ...loadRecent().filter((s) => s.code !== symbol.code)].slice(0, MAX)
    try {
        localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
        // 無痕模式或儲存空間被鎖住時忽略，功能照常只是記不住。
    }
    return next
}

export function clearRecent(): Symbol[] {
    try {
        localStorage.removeItem(KEY)
    } catch {
        // 同上
    }
    return []
}
