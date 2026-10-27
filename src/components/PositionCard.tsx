import {
    formatMoney, formatPercent, formatPrice, formatShares, formatSigned,
    type PositionCalculation,
} from '../lib/calc'
import type { Quote } from '../lib/quote'
import { TrashIcon } from './icons'
import { LotEditor, type LotInput } from './LotEditor'

interface Props {
    code: string
    name: string
    lots: LotInput[]
    quote: Quote | null
    loading: boolean
    /** 不需要報價就算得出來的部分：總股數與平均成本，隨輸入即時更新。 */
    live: PositionCalculation
    /** 上次按下計算時的結果；還沒算過是 null。 */
    result: PositionCalculation | null
    /** 結果算出來之後輸入又被改過了。 */
    stale: boolean
    onLotsChange: (lots: LotInput[]) => void
    onRemove: () => void
}

export function PositionCard({
    code, name, lots, quote, loading, live, result, stale, onLotsChange, onRemove,
}: Props) {
    const change = quote ? quote.price - quote.prevClose : 0
    const changeRate = quote && quote.prevClose > 0 ? change / quote.prevClose : 0
    // 台股漲紅跌綠，和多數國家相反。
    const quoteTone = change > 0 ? 'text-up' : change < 0 ? 'text-down' : 'text-muted-foreground'
    const pnl = result?.pnl ?? 0
    const pnlTone = pnl > 0 ? 'text-up' : pnl < 0 ? 'text-down' : 'text-foreground'

    return (
        <section className="overflow-hidden rounded-lg border border-border bg-card">
            <header className="flex items-center gap-3 px-3 py-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                        <h3 className="truncate font-medium">{name}</h3>
                        <span className="font-num shrink-0 text-xs text-muted-foreground">{code}</span>
                    </div>
                    {quote ? (
                        <p className={`font-num mt-0.5 text-sm ${quoteTone}`}>
                            {formatPrice(quote.price)}
                            <span className="ml-2 text-xs">
                                {formatSigned(changeRate, formatPercent)}
                            </span>
                            {!quote.isLive && (
                                <span className="ml-2 text-xs text-subtle">昨收</span>
                            )}
                        </p>
                    ) : (
                        <p className="mt-0.5 text-sm text-subtle">
                            {loading ? '查詢報價中…' : '查不到報價'}
                        </p>
                    )}
                </div>

                <button
                    type="button"
                    onClick={onRemove}
                    aria-label={`移除 ${name}`}
                    className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg
                               text-subtle transition-colors duration-200 hover:bg-muted hover:text-foreground"
                >
                    <TrashIcon className="size-4" />
                </button>
            </header>

            <div className="border-t border-border px-3 py-3">
                <LotEditor lots={lots} onChange={onLotsChange} />
            </div>

            {live.totalShares > 0 && (
                <footer className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1
                                   border-t border-border bg-muted/40 px-3 py-2.5">
                    <span className="font-num text-xs text-muted-foreground">
                        {formatShares(live.totalShares)} 股 · 均價 {formatPrice(live.avgCost)}
                    </span>
                    {result && result.quotePrice != null ? (
                        <span
                            className={`font-num text-sm font-medium transition-opacity duration-200
                                        ${pnlTone} ${stale ? 'opacity-40' : ''}`}
                        >
                            {formatSigned(result.pnl, formatMoney)}
                            <span className="ml-2 text-xs">
                                {formatSigned(result.returnRate, formatPercent)}
                            </span>
                        </span>
                    ) : (
                        <span className="font-num text-xs text-subtle">
                            成本 {formatMoney(live.totalCost)}
                        </span>
                    )}
                </footer>
            )}
        </section>
    )
}
