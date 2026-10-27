import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchQuote, fetchQuotes } from '../quote'

/** 用證交所 MIS 真實回應的欄位形狀，只保留本專案會讀到的幾個。 */
function misRow(overrides: Record<string, string> = {}) {
    return { c: '2330', n: '台積電', z: '2400.0000', y: '2385.0000', t: '13:30:00', ...overrides }
}

function mockMis(body: unknown, ok = true) {
    vi.stubGlobal('fetch', vi.fn(async () => ({
        ok,
        status: ok ? 200 : 500,
        json: async () => body,
    })))
}

afterEach(() => vi.unstubAllGlobals())

describe('fetchQuotes', () => {
    it('把成交價當作報價', async () => {
        mockMis({ rtcode: '0000', msgArray: [misRow()] })

        const quote = await fetchQuote('2330', 'tse')

        expect(quote?.price).toBe(2400)
        expect(quote?.prevClose).toBe(2385)
        expect(quote?.isLive).toBe(true)
        expect(quote?.name).toBe('台積電')
    })

    it('今日尚未成交時退回昨收，並標示不是即時價', async () => {
        // 開盤前或無成交時 MIS 的 z 會是 '-' 或空字串
        for (const empty of ['-', '', '  ']) {
            mockMis({ rtcode: '0000', msgArray: [misRow({ z: empty })] })

            const quote = await fetchQuote('2330', 'tse')

            expect(quote?.price).toBe(2385)
            expect(quote?.isLive).toBe(false)
        }
    })

    it('成交價與昨收都沒有時視為查無資料，不回傳 0 元的報價', async () => {
        mockMis({ rtcode: '0000', msgArray: [misRow({ z: '-', y: '-' })] })

        expect(await fetchQuote('2330', 'tse')).toBeNull()
    })

    it('一次查多檔只發一個請求，代號以 | 串接', async () => {
        mockMis({ rtcode: '0000', msgArray: [misRow(), misRow({ c: '6488', n: '環球晶', z: '814.0000' })] })

        const quotes = await fetchQuotes([
            { code: '2330', market: 'tse' },
            { code: '6488', market: 'otc' },
        ])

        expect(fetch).toHaveBeenCalledTimes(1)
        const url = vi.mocked(fetch).mock.calls[0][0] as string
        expect(url).toContain('tse_2330.tw%7Cotc_6488.tw')
        expect(quotes.get('2330')?.price).toBe(2400)
        expect(quotes.get('6488')?.price).toBe(814)
    })

    it('沒有要查的標的時不發請求', async () => {
        mockMis({ rtcode: '0000', msgArray: [] })

        const quotes = await fetchQuotes([])

        expect(quotes.size).toBe(0)
        expect(fetch).not.toHaveBeenCalled()
    })

    it('證交所回傳錯誤代碼時拋出，不讓畫面顯示空白了事', async () => {
        mockMis({ rtcode: '5001', msgArray: [] })

        await expect(fetchQuote('2330', 'tse')).rejects.toThrow()
    })

    it('HTTP 失敗時拋出', async () => {
        mockMis({}, false)

        await expect(fetchQuote('2330', 'tse')).rejects.toThrow()
    })

    it('每次請求都帶時間戳，避免拿到中間層快取的舊價', async () => {
        mockMis({ rtcode: '0000', msgArray: [misRow()] })

        await fetchQuote('2330', 'tse')

        expect(vi.mocked(fetch).mock.calls[0][0]).toMatch(/[?&]_=\d+/)
    })
})
