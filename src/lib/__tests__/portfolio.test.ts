import { describe, expect, it } from 'vitest'
import { DEFAULT_FEES, calculate, calculatePortfolio, type Position } from '../calc'

const FEES = DEFAULT_FEES

function position(code: string, lots: { shares: number; price: number }[]): Position {
    return { id: code, code, name: code, lots }
}

describe('calculatePortfolio', () => {
    it('每一檔的最低手續費各自計算，不是整個組合收一次', () => {
        // 五檔各 3000 元，每筆手續費都不足 20 元而以最低收費計
        const small = ['2330', '2317', '2454', '2412', '1301'].map((c) =>
            position(c, [{ shares: 100, price: 30 }]),
        )
        const quotes = new Map(small.map((p) => [p.code, 30]))

        const result = calculatePortfolio(small, quotes, FEES)
        const buyFees = result.positions.reduce((sum, p) => sum + p.buyFee, 0)

        expect(buyFees).toBe(100) // 5 × 20
        // 若用組合總額 15000 去算，只會得到單筆的 20 元，差五倍
        expect(buyFees).not.toBe(20)
    })

    it('證交稅逐檔判斷 ETF，不套用組合層級的單一稅率', () => {
        const positions = [
            position('0050', [{ shares: 1000, price: 100 }]), // ETF 0.1%
            position('2330', [{ shares: 1000, price: 100 }]), // 一般股 0.3%
        ]
        const quotes = new Map([['0050', 100], ['2330', 100]])

        const result = calculatePortfolio(positions, quotes, FEES)

        expect(result.positions.find((p) => p.code === '0050')!.tax).toBe(100)
        expect(result.positions.find((p) => p.code === '2330')!.tax).toBe(300)
    })

    it('總計等於各檔相加', () => {
        const positions = [
            position('2330', [{ shares: 100, price: 2000 }, { shares: 200, price: 2050 }]),
            position('6488', [{ shares: 500, price: 800 }]),
        ]
        const quotes = new Map([['2330', 2400], ['6488', 814]])

        const result = calculatePortfolio(positions, quotes, FEES)

        for (const key of ['totalCost', 'marketValue', 'grossPnl', 'tradingCost', 'pnl'] as const) {
            const expected = result.positions.reduce((sum, p) => sum + p[key], 0)
            expect(result[key]).toBe(expected)
        }
    })

    it('單一持倉的組合結果，與直接算那一檔相同', () => {
        const lots = [{ shares: 100, price: 2000 }, { shares: 200, price: 2050 }]
        const single = calculate(lots, 2400, FEES, false)
        const asPortfolio = calculatePortfolio([position('2330', lots)], new Map([['2330', 2400]]), FEES)

        expect(asPortfolio.pnl).toBe(single.pnl)
        expect(asPortfolio.totalCost).toBe(single.totalCost)
        expect(asPortfolio.returnRate).toBeCloseTo(single.returnRate, 10)
    })

    it('有一檔還沒拿到報價時標記總計不完整，但成本仍然算得出來', () => {
        const positions = [
            position('2330', [{ shares: 100, price: 2000 }]),
            position('6488', [{ shares: 100, price: 800 }]),
        ]
        const quotes = new Map([['2330', 2400]]) // 6488 查不到

        const result = calculatePortfolio(positions, quotes, FEES)

        expect(result.hasAllQuotes).toBe(false)
        expect(result.totalCost).toBe(200_000 + 80_000)
        expect(result.marketValue).toBe(240_000) // 只有 2330 計入
    })

    it('還沒填任何數量的持倉不計入，也不會讓報酬率變成 NaN', () => {
        const positions = [position('2330', [{ shares: Number.NaN, price: Number.NaN }])]

        const result = calculatePortfolio(positions, new Map([['2330', 2400]]), FEES)

        expect(result.fundedCount).toBe(0)
        expect(result.hasAllQuotes).toBe(false)
        expect(Number.isFinite(result.returnRate)).toBe(true)
        expect(result.returnRate).toBe(0)
    })

    it('空組合不產生 NaN 或 Infinity', () => {
        const result = calculatePortfolio([], new Map(), FEES)

        for (const key of ['totalCost', 'marketValue', 'grossPnl', 'tradingCost', 'pnl', 'returnRate'] as const) {
            expect(result[key]).toBe(0)
        }
    })

    it('報酬率的分母是全部實際投入的錢，含每一檔的買進手續費', () => {
        const positions = [
            position('2330', [{ shares: 100, price: 2000 }]),
            position('6488', [{ shares: 100, price: 800 }]),
        ]
        const quotes = new Map([['2330', 2400], ['6488', 900]])

        const result = calculatePortfolio(positions, quotes, FEES)
        const invested = result.totalCost + result.positions.reduce((s, p) => s + p.buyFee, 0)

        expect(result.returnRate).toBeCloseTo(result.pnl / invested, 10)
    })

    it('一賺一賠時總計是淨值，不是取絕對值相加', () => {
        const positions = [
            position('2330', [{ shares: 100, price: 2000 }]), // 漲
            position('6488', [{ shares: 100, price: 900 }]),  // 跌
        ]
        const quotes = new Map([['2330', 2400], ['6488', 800]])

        const result = calculatePortfolio(positions, quotes, FEES)

        expect(result.grossPnl).toBe(40_000 - 10_000)
    })
})

describe('逐筆手續費', () => {
    // 使用者的實際案例：同一檔分三次買，另一檔分兩次買
    const positions: Position[] = [
        {
            id: '0050', code: '0050', name: '元大台灣50',
            lots: [
                { shares: 500, price: 100 }, // 50,000
                { shares: 300, price: 95 },  // 28,500
                { shares: 100, price: 106 }, // 10,600 → 費用不足 20，以最低收費計
            ],
        },
        {
            id: '2330', code: '2330', name: '台積電',
            lots: [
                { shares: 100, price: 2350 }, // 235,000
                { shares: 100, price: 2450 }, // 245,000
            ],
        },
    ]
    const quotes = new Map([['0050', 100], ['2330', 2400]])

    it('每一筆買進各收一次手續費，不是每一檔收一次', () => {
        const result = calculatePortfolio(positions, quotes, DEFAULT_FEES)
        const etf = result.positions.find((p) => p.code === '0050')!
        const tsmc = result.positions.find((p) => p.code === '2330')!

        // 0050：42 + 24 + 20（第三筆觸及最低收費）
        expect(etf.buyFee).toBe(42 + 24 + 20)
        // 2330：200 + 209
        expect(tsmc.buyFee).toBe(200 + 209)
        expect(result.positions.reduce((s, p) => s + p.buyFee, 0)).toBe(495)
    })

    it('把同一檔的批次先加總再算費用會少收，差額來自被吃掉的最低收費', () => {
        const result = calculatePortfolio(positions, quotes, DEFAULT_FEES)
        const perLot = result.positions.reduce((s, p) => s + p.buyFee, 0)

        // 若先加總：0050 的 89,100 算出 76、2330 的 480,000 算出 410，合計 486
        const naivePerStock = 76 + 410

        expect(perLot).toBeGreaterThan(naivePerStock)
        expect(perLot - naivePerStock).toBe(9)
    })

    it('賣出假設整個部位一次賣掉，所以每一檔只收一筆賣出手續費', () => {
        const result = calculatePortfolio(positions, quotes, DEFAULT_FEES)
        const etf = result.positions.find((p) => p.code === '0050')!

        // 0050 市值 900 股 × 100 = 90,000 → 76，而不是三筆分開算
        expect(etf.sellFee).toBe(76)
    })
})
