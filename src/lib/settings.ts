import { DEFAULT_FEES, type FeeSettings } from './calc'

/**
 * 手續費設定。和最近查詢一樣只是省去重複輸入的便利資料，不是使用者的部位。
 * localStorage 在無痕模式等情況會拋錯，所有存取都要包住。
 */
const KEY = 'fee-settings'

export function loadFees(): FeeSettings {
    try {
        const raw = localStorage.getItem(KEY)
        if (!raw) return DEFAULT_FEES
        const parsed: unknown = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object') return DEFAULT_FEES
        const { discount, minimumFee } = parsed as Partial<FeeSettings>
        return {
            discount: Number.isFinite(discount) && discount! > 0 ? discount! : DEFAULT_FEES.discount,
            minimumFee:
                Number.isFinite(minimumFee) && minimumFee! >= 0 ? minimumFee! : DEFAULT_FEES.minimumFee,
        }
    } catch {
        return DEFAULT_FEES
    }
}

export function saveFees(fees: FeeSettings): FeeSettings {
    try {
        localStorage.setItem(KEY, JSON.stringify(fees))
    } catch {
        // 存不起來就只是記不住，計算本身不受影響。
    }
    return fees
}
