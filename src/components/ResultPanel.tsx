import { useState } from 'react'
import {
    formatMoney, formatPercent, formatPrice, formatShares, formatSigned, type Calculation,
} from '../lib/calc'
import { ChevronDownIcon } from './icons'

interface Props {
    calc: Calculation
    quotePrice: number | null
    isEtf: boolean
}

export function ResultPanel({ calc, quotePrice, isEtf }: Props) {
    const [showBreakdown, setShowBreakdown] = useState(false)

    if (calc.totalShares === 0) {
        return (
            <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm
                          text-muted-foreground">
                填入股數與買進價就會算出盈虧
            </p>
        )
    }

    const hasQuote = quotePrice != null
    // 台股漲紅跌綠，和多數國家相反。
    const tone = calc.pnl > 0 ? 'text-up' : calc.pnl < 0 ? 'text-down' : 'text-foreground'

    return (
        <section className="overflow-hidden rounded-lg border border-border bg-card">
            <dl className="divide-y divide-border">
                <Row label="現價" value={hasQuote ? `${formatPrice(quotePrice)} 元` : '—'} />
                <Row label="總股數" value={`${formatShares(calc.totalShares)} 股`} />
                <Row label="平均成本" value={`${formatPrice(calc.avgCost)} 元`} />
                <Row label="買進成本" value={`${formatMoney(calc.totalCost)} 元`} />
                <Row label="現在市值" value={hasQuote ? `${formatMoney(calc.marketValue)} 元` : '—'} />
                <Row
                    label="帳面價差"
                    hint="未扣費用"
                    value={hasQuote ? `${formatSigned(calc.grossPnl, formatMoney)} 元` : '—'}
                />
                <Row
                    label="交易成本"
                    hint="來回"
                    value={hasQuote ? `-${formatMoney(calc.tradingCost)} 元` : '—'}
                    onToggle={hasQuote ? () => setShowBreakdown(!showBreakdown) : undefined}
                    expanded={showBreakdown}
                />
            </dl>

            {hasQuote && showBreakdown && (
                <dl className="divide-y divide-border border-t border-border bg-muted/40">
                    <Row sub label="買進手續費" value={`-${formatMoney(calc.buyFee)} 元`} />
                    <Row sub label="賣出手續費" value={`-${formatMoney(calc.sellFee)} 元`} />
                    <Row
                        sub
                        label={`證交稅 ${isEtf ? 'ETF 0.1%' : '0.3%'}`}
                        value={`-${formatMoney(calc.tax)} 元`}
                    />
                </dl>
            )}

            {hasQuote ? (
                <div className="border-t border-border bg-muted/60 px-4 py-4">
                    <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm text-muted-foreground">盈虧</span>
                        <span className={`font-num text-3xl font-semibold ${tone}`}>
                            {formatSigned(calc.pnl, formatMoney)}
                        </span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between gap-2">
                        <span className="text-sm text-muted-foreground">報酬率</span>
                        <span className={`font-num text-lg font-medium ${tone}`}>
                            {formatSigned(calc.returnRate, formatPercent)}
                        </span>
                    </div>
                    <p className="mt-2 text-xs text-subtle">已扣除買賣手續費與證交稅</p>
                </div>
            ) : (
                <p className="border-t border-border bg-muted/40 px-4 py-4 text-sm text-muted-foreground">
                    取得報價後才能算盈虧
                </p>
            )}
        </section>
    )
}

interface RowProps {
    label: string
    value: string
    hint?: string
    sub?: boolean
    onToggle?: () => void
    expanded?: boolean
}

function Row({ label, value, hint, sub, onToggle, expanded }: RowProps) {
    const body = (
        <>
            <dt className={`flex items-center gap-1.5 text-sm ${sub ? 'text-subtle' : 'text-muted-foreground'}`}>
                {label}
                {hint && <span className="text-xs text-subtle">{hint}</span>}
                {onToggle && (
                    <ChevronDownIcon
                        className={`size-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                    />
                )}
            </dt>
            <dd className={`font-num ${sub ? 'text-sm text-muted-foreground' : 'font-medium'}`}>{value}</dd>
        </>
    )

    if (onToggle) {
        return (
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={expanded}
                className="flex w-full cursor-pointer items-baseline justify-between gap-2 px-4 py-3 text-left
                           transition-colors duration-200 hover:bg-muted"
            >
                {body}
            </button>
        )
    }

    return (
        <div className={`flex items-baseline justify-between gap-2 px-4 ${sub ? 'py-2.5' : 'py-3'}`}>
            {body}
        </div>
    )
}
