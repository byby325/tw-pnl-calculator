import rawSymbols from '../data/symbols.json'

/** 上市為 tse、上櫃為 otc。證交所 MIS 的 ex_ch 參數需要這個前綴。 */
export type Market = 'tse' | 'otc'

export interface Symbol {
    code: string
    name: string
    market: Market
}

/** 建置時由 scripts/build-symbol-dict.mjs 產出，執行期不連網（ADR-0011）。 */
export const SYMBOLS = rawSymbols as Symbol[]

const BY_CODE = new Map(SYMBOLS.map((s) => [s.code, s]))

export function findByCode(code: string): Symbol | undefined {
    return BY_CODE.get(code.trim().toUpperCase())
}

/**
 * 以代號或名稱搜尋標的。代號完全相同排最前，其次是代號開頭相符，最後是名稱包含。
 * 代號不保證是純數字（主動式 ETF 如 00400A），所以一律當字串比對。
 */
export function searchSymbols(query: string, limit = 8): Symbol[] {
    const q = query.trim().toUpperCase()
    if (!q) return []

    const exact: Symbol[] = []
    const codePrefix: Symbol[] = []
    const nameMatch: Symbol[] = []

    for (const s of SYMBOLS) {
        if (s.code === q) exact.push(s)
        else if (s.code.startsWith(q)) codePrefix.push(s)
        else if (s.name.includes(query.trim())) nameMatch.push(s)
        if (exact.length + codePrefix.length >= limit && nameMatch.length >= limit) break
    }

    return [...exact, ...codePrefix, ...nameMatch].slice(0, limit)
}
