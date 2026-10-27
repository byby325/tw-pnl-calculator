import { describe, expect, it } from 'vitest'
import { DEFAULT_FEES, calculate, isEtfCode, isUsableLot, type FeeSettings } from '../calc'

/** 六折、最低 20 元，也就是預設值。 */
const SIX_TENTHS: FeeSettings = DEFAULT_FEES
const NO_DISCOUNT: FeeSettings = { discount: 1, minimumFee: 20 }

describe('calculate', () => {
    it('單一批次以買進價與報價算出盈虧', () => {
        const result = calculate([{ shares: 1000, price: 100 }], 110, NO_DISCOUNT, false)

        expect(result.totalShares).toBe(1000)
        expect(result.totalCost).toBe(100_000)
        expect(result.avgCost).toBe(100)
        expect(result.marketValue).toBe(110_000)
        expect(result.grossPnl).toBe(10_000)
    })

    it('多個批次以加權平均計算成本，而不是價格的算術平均', () => {
        // 100 股 2000 加 200 股 2050：平均應偏向買得多的那一邊，不是 2025
        const result = calculate(
            [{ shares: 100, price: 2000 }, { shares: 200, price: 2050 }],
            2400, SIX_TENTHS, false,
        )

        expect(result.totalShares).toBe(300)
        expect(result.totalCost).toBe(610_000)
        expect(result.avgCost).toBeCloseTo(2033.33, 2)
        expect(result.avgCost).not.toBe(2025)
    })

    it('盈虧是扣掉來回交易成本之後的淨額，不等於帳面價差', () => {
        const result = calculate(
            [{ shares: 100, price: 2000 }, { shares: 200, price: 2050 }],
            2400, SIX_TENTHS, false,
        )

        expect(result.grossPnl).toBe(110_000)
        expect(result.buyFee).toBe(521) // 610000 × 0.1425% × 0.6 捨去
        expect(result.sellFee).toBe(615) // 720000 × 0.1425% × 0.6 捨去
        expect(result.tax).toBe(2160) // 720000 × 0.3%
        expect(result.tradingCost).toBe(3296)
        expect(result.pnl).toBe(110_000 - 3296)
    })

    it('分項成本加起來等於交易成本總計，不會因為各自四捨五入而差一元', () => {
        const result = calculate([{ shares: 300, price: 2033 }], 2400, SIX_TENTHS, false)

        expect(result.buyFee + result.sellFee + result.tax).toBe(result.tradingCost)
    })

    it('報酬率的分母是買進成本加買進手續費，也就是實際投入的錢', () => {
        const result = calculate([{ shares: 1000, price: 100 }], 110, NO_DISCOUNT, false)

        expect(result.returnRate).toBeCloseTo(result.pnl / (result.totalCost + result.buyFee), 10)
    })

    it('ETF 的證交稅率是 0.1%，一般股票是 0.3%', () => {
        const lots = [{ shares: 1000, price: 100 }]
        const stock = calculate(lots, 100, NO_DISCOUNT, false)
        const etf = calculate(lots, 100, NO_DISCOUNT, true)

        expect(stock.tax).toBe(300)
        expect(etf.tax).toBe(100)
    })

    it('金額很小時手續費以最低收費計，不是等比例縮小', () => {
        // 1000 元 × 0.1425% × 0.6 只有 0.855 元，但券商至少收 20
        const result = calculate([{ shares: 10, price: 100 }], 100, SIX_TENTHS, false)

        expect(result.buyFee).toBe(20)
        expect(result.sellFee).toBe(20)
    })

    it('手續費小數無條件捨去，符合券商實務', () => {
        // 1,000,000 × 0.1425% × 1 = 1425 整；用 999,999 製造小數
        const result = calculate([{ shares: 1, price: 999_999 }], 999_999, NO_DISCOUNT, false)

        expect(Number.isInteger(result.buyFee)).toBe(true)
        expect(result.buyFee).toBe(Math.floor(999_999 * 0.001425))
    })

    it('還沒取得報價時仍算得出成本，但市值與盈虧為零', () => {
        const result = calculate([{ shares: 100, price: 50 }], null, NO_DISCOUNT, false)

        expect(result.totalCost).toBe(5000)
        expect(result.avgCost).toBe(50)
        expect(result.marketValue).toBe(0)
        expect(result.pnl).toBe(0)
        expect(result.returnRate).toBe(0)
    })

    it('忽略填到一半的批次，不讓它污染平均成本', () => {
        const withBlank = calculate(
            [{ shares: 100, price: 50 }, { shares: Number.NaN, price: Number.NaN }],
            50, NO_DISCOUNT, false,
        )
        const withoutBlank = calculate([{ shares: 100, price: 50 }], 50, NO_DISCOUNT, false)

        expect(withBlank.totalShares).toBe(withoutBlank.totalShares)
        expect(withBlank.avgCost).toBe(withoutBlank.avgCost)
    })

    it('沒有任何可用批次時不會出現 NaN 或 Infinity', () => {
        const result = calculate([], 100, NO_DISCOUNT, false)

        for (const value of Object.values(result)) {
            expect(Number.isFinite(value)).toBe(true)
        }
        expect(result.returnRate).toBe(0)
    })

    it('下跌時盈虧為負', () => {
        const result = calculate([{ shares: 1000, price: 100 }], 90, NO_DISCOUNT, false)

        expect(result.grossPnl).toBe(-10_000)
        expect(result.pnl).toBeLessThan(0)
        expect(result.returnRate).toBeLessThan(0)
    })
})

describe('isUsableLot', () => {
    it.each([
        ['兩欄都填', { shares: 100, price: 50 }, true],
        ['股數為零', { shares: 0, price: 50 }, false],
        ['股數為負', { shares: -100, price: 50 }, false],
        ['價格為零', { shares: 100, price: 0 }, false],
        ['價格未填', { shares: 100, price: Number.NaN }, false],
    ])('%s → %s', (_name, lot, expected) => {
        expect(isUsableLot(lot)).toBe(expected)
    })
})

describe('isEtfCode', () => {
    it.each([
        ['0050', true],
        ['00878', true],
        ['00400A', true], // 主動式 ETF，代號帶英文字母
        ['2330', false],
        ['6488', false],
    ])('%s → %s', (code, expected) => {
        expect(isEtfCode(code)).toBe(expected)
    })
})
