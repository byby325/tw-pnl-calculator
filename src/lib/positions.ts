import type { Position } from './calc'
import type { Market } from './symbols'

/**
 * 持倉存在裝置本機。存的只有「使用者輸入過的持倉」—— 不存歷史、不做損益走勢、
 * 不跨裝置同步。那條線一旦跨過去，這個工具就從有記憶的計算機變成持股追蹤服務
 * （ADR-0017）。
 *
 * localStorage 在無痕模式等情況會直接拋錯，所有存取都要包住。
 */
const KEY = 'positions'
/** 資料格式版本；讀到不認識的版本就當成沒有資料，不嘗試遷移。 */
const SCHEMA = 1

interface Stored {
    schema: number
    positions: StoredPosition[]
}

interface StoredPosition {
    id: string
    code: string
    name: string
    market: Market
    lots: { shares: number; price: number }[]
}

/** 介面上的持倉比計算用的多帶市場別，組 MIS 的 ex_ch 參數需要。 */
export interface HeldPosition extends Position {
    market: Market
}

function isStoredPosition(value: unknown): value is StoredPosition {
    if (!value || typeof value !== 'object') return false
    const p = value as Partial<StoredPosition>
    return (
        typeof p.id === 'string' &&
        typeof p.code === 'string' &&
        typeof p.name === 'string' &&
        (p.market === 'tse' || p.market === 'otc') &&
        Array.isArray(p.lots)
    )
}

export function loadPositions(): HeldPosition[] {
    try {
        const raw = localStorage.getItem(KEY)
        if (!raw) return []
        const parsed: unknown = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object') return []
        const stored = parsed as Partial<Stored>
        if (stored.schema !== SCHEMA || !Array.isArray(stored.positions)) return []

        return stored.positions.filter(isStoredPosition).map((p) => ({
            ...p,
            lots: p.lots
                .filter((l) => l && typeof l.shares === 'number' && typeof l.price === 'number')
                .map((l) => ({ shares: l.shares, price: l.price })),
        }))
    } catch {
        return []
    }
}

export function savePositions(positions: HeldPosition[]): HeldPosition[] {
    try {
        const payload: Stored = { schema: SCHEMA, positions }
        localStorage.setItem(KEY, JSON.stringify(payload))
    } catch {
        // 存不起來就只是記不住，計算本身不受影響。
    }
    return positions
}
