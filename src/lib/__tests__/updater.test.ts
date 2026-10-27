import { describe, expect, it } from 'vitest'
import { isNewer } from '../updater'

describe('isNewer', () => {
    it('比較的是數字大小，不是字典序', () => {
        // 字典序會把 '1.2.10' 判成小於 '1.2.9'，那會讓第 10 個修正版發不出去
        expect(isNewer('1.2.10', '1.2.9')).toBe(true)
        expect(isNewer('1.2.9', '1.2.10')).toBe(false)
    })

    it('相同版本不算新版，避免每次開啟都重複下載', () => {
        expect(isNewer('1.0.0', '1.0.0')).toBe(false)
    })

    it('段數不同時以零補齊，1.0 與 1.0.0 視為同一版', () => {
        // APK 的 versionName 可能寫 1.0，manifest 寫 1.0.0，兩者不該觸發更新
        expect(isNewer('1.0.0', '1.0')).toBe(false)
        expect(isNewer('1.0', '1.0.0')).toBe(false)
        expect(isNewer('1.0.1', '1.0')).toBe(true)
    })

    it('主版本的優先序高於次版本', () => {
        expect(isNewer('2.0.0', '1.99.99')).toBe(true)
        expect(isNewer('1.99.99', '2.0.0')).toBe(false)
    })

    it('基準是無法解析的字串時仍判定為有新版，不會永遠卡住不更新', () => {
        // 尚未套用過更新時可能拿到 'builtin' 之類的字串；若因此永遠回 false，
        // 全新安裝的裝置會收不到任何更新，而且不會報錯
        expect(isNewer('1.0.1', 'builtin')).toBe(true)
    })

    it('候選版本無法解析時不更新，避免被壞掉的 manifest 觸發', () => {
        expect(isNewer('unknown', '1.0.0')).toBe(false)
    })
})
