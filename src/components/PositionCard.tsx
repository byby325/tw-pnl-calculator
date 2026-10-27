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
    calc: PositionCalculation
    onLotsChange: (lots: LotInput[]) => void
    onRemove: () => void
}

export function PositionCard({
    code, name, lots, quote, loading, calc, onLotsChange, onRemove,
}: Props) {
    const change = quote ? quote.price - quote.prevClose : 0
    const changeRate = quote && quote.prevClose > 0 ? change / quote.prevClose : 0
    // 台股漲紅跌綠，和多數國家相反。
    const quoteTone = change > 0 ? 'text-up' : change < 0 ? 'text-down' : 'text-muted-foreground'
    const pnlTone = calc.pnl > 0 ? 'text-up' : calc.pnl < 0 ? 'text-down' : 'text-foreground'

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

            {calc.totalShares > 0 && (
                <footer className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1
                                   border-t border-border bg-muted/40 px-3 py-2.5">
                    <span className="font-num text-xs text-muted-foreground">
                        {formatShares(calc.totalShares)} 股 · 均價 {formatPrice(calc.avgCost)}
                    </span>
                    {calc.quotePrice != null ? (
                        <span className={`font-num text-sm font-medium ${pnlTone}`}>
                            {formatSigned(calc.pnl, formatMoney)}
                            <span className="ml-2 text-xs">
                                {formatSigned(calc.returnRate, formatPercent)}
                            </span>
                        </span>
                    ) : (
                        <span className="font-num text-xs text-subtle">
                            成本 {formatMoney(calc.totalCost)}
                        </span>
                    )}
                </footer>
            )}
        </section>
    )
}
