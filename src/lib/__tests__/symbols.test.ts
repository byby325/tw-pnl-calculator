import { describe, expect, it } from 'vitest'
import { SYMBOLS, findByCode, searchSymbols } from '../symbols'

describe('字典本身', () => {
    it('上市與上櫃都有收錄', () => {
        expect(SYMBOLS.some((s) => s.market === 'tse')).toBe(true)
        expect(SYMBOLS.some((s) => s.market === 'otc')).toBe(true)
        expect(SYMBOLS.length).toBeGreaterThan(1000)
    })

    it('沒有重複代號，否則 ex_ch 會組出錯的市場別', () => {
        expect(new Set(SYMBOLS.map((s) => s.code)).size).toBe(SYMBOLS.length)
    })
})

describe('findByCode', () => {
    it('查得到台積電並標示為上市', () => {
        expect(findByCode('2330')).toMatchObject({ name: '台積電', market: 'tse' })
    })

    it('容忍前後空白', () => {
        expect(findByCode('  2330 ')?.code).toBe('2330')
    })

    it('查不到時回傳 undefined', () => {
        expect(findByCode('9999999')).toBeUndefined()
    })
})

describe('searchSymbols', () => {
    it('完全相符的代號排在最前面', () => {
        expect(searchSymbols('2330')[0].code).toBe('2330')
    })

    it('可以用中文名稱搜尋', () => {
        expect(searchSymbols('台積電').some((s) => s.code === '2330')).toBe(true)
    })

    it('代號開頭相符也查得到', () => {
        const result = searchSymbols('233')
        expect(result.length).toBeGreaterThan(0)
        expect(result.every((s) => s.code.startsWith('233') || s.name.includes('233'))).toBe(true)
    })

    it('空字串不回傳任何結果，避免一打開就塞滿整份清單', () => {
        expect(searchSymbols('')).toEqual([])
        expect(searchSymbols('   ')).toEqual([])
    })

    it('回傳數量不超過上限', () => {
        expect(searchSymbols('0', 5).length).toBeLessThanOrEqual(5)
    })

    it('代號不限純數字，帶英文字母的主動式 ETF 也要找得到', () => {
        const lettered = SYMBOLS.find((s) => /[A-Z]/.test(s.code))
        expect(lettered).toBeDefined()
        expect(searchSymbols(lettered!.code)[0].code).toBe(lettered!.code)
    })
})
