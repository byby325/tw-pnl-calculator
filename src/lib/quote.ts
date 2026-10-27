import type { Market } from './symbols'

export interface Quote {
    code: string
    name: string
    /** 報價：交易時段內是成交價，尚未成交或已收盤則是上一交易日收盤價。 */
    price: number
    prevClose: number
    /** true 表示今天真的有成交、price 來自 z 欄位；false 表示退回昨收。 */
    isLive: boolean
    /** MIS 回報的資料時間，例如 13:30:00。沒有就是空字串。 */
    at: string
}

/**
 * 證交所不回 CORS header，所以瀏覽器打不到。開發時走 vite.config.ts 的 dev proxy
 * 代打，打包成 APK 後由 CapacitorHttp 轉給原生層直接打，原生 HTTP 沒有 CORS
 * 這個概念（ADR-0011）。
 */
const MIS_BASE = import.meta.env.DEV ? '/mis' : 'https://mis.twse.com.tw'

interface MisRow {
    c?: string
    n?: string
    z?: string
    y?: string
    t?: string
}

/** MIS 的數字欄位在無資料時是空字串或 '-'，parseFloat 會得到 NaN。 */
function toNumber(raw: string | undefined): number {
    const n = Number.parseFloat(raw ?? '')
    return Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * 一次取回多檔報價。MIS 的 ex_ch 可用 | 串接多檔，所以不論幾檔都只打一個請求。
 * 回傳以代號為鍵，查不到的代號不會出現在結果裡。
 */
export async function fetchQuotes(
    targets: { code: string; market: Market }[],
    signal?: AbortSignal,
): Promise<Map<string, Quote>> {
    const result = new Map<string, Quote>()
    if (targets.length === 0) return result

    const exCh = targets
        .map((t) => `${t.market}_${encodeURIComponent(t.code)}.tw`)
        .join('%7C')
    const url = `${MIS_BASE}/stock/api/getStockInfo.jsp?ex_ch=${exCh}&json=1&delay=0&_=${Date.now()}`

    const res = await fetch(url, {
        signal,
        headers: {
            Accept: 'application/json',
            // 實測 MIS 不帶 Referer 也會回應，留著只是低成本的保險（見 ADR-0010 文末的更正）。
            // 瀏覽器會忽略這個 header，只有走原生層時才真的送出去。
            Referer: 'https://mis.twse.com.tw/stock/index.jsp',
        },
    })
    if (!res.ok) throw new Error(`證交所回應 ${res.status}`)

    const data = (await res.json()) as { rtcode?: string; msgArray?: MisRow[] }
    if (data.rtcode !== '0000') throw new Error(`證交所回傳錯誤代碼 ${data.rtcode ?? '未知'}`)

    for (const row of data.msgArray ?? []) {
        const code = row.c?.trim()
        if (!code) continue

        const traded = toNumber(row.z)
        const prevClose = toNumber(row.y)
        const price = traded || prevClose
        if (!price) continue

        result.set(code, {
            code,
            name: row.n?.trim() || code,
            price,
            prevClose: prevClose || price,
            isLive: traded > 0,
            at: row.t?.trim() ?? '',
        })
    }

    return result
}

export async function fetchQuote(
    code: string,
    market: Market,
    signal?: AbortSignal,
): Promise<Quote | null> {
    const quotes = await fetchQuotes([{ code, market }], signal)
    return quotes.get(code) ?? null
}
