import { useState } from 'react'
import {
    formatMoney, formatPercent, formatSigned, type PortfolioCalculation,
} from '../lib/calc'
import { ChevronDownIcon } from './icons'

interface Props {
    calc: PortfolioCalculation
}

export function PortfolioSummary({ calc }: Props) {
    const [open, setOpen] = useState(false)

    if (calc.fundedCount === 0) {
        return (
            <section className="rounded-lg border border-dashed border-border px-4 py-6 text-center
                                text-sm text-muted-foreground">
                填入股數與買進價就會算出組合總盈虧
            </section>
        )
    }

    // 台股漲紅跌綠，和多數國家相反。
    const tone = calc.pnl > 0 ? 'text-up' : calc.pnl < 0 ? 'text-down' : 'text-foreground'

    return (
        <section className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="px-4 pt-4">
                <p className="text-xs text-muted-foreground">
                    組合總盈虧　{calc.fundedCount} 檔
                </p>
                <p className={`font-num mt-1 text-4xl font-semibold ${tone}`}>
                    {formatSigned(calc.pnl, formatMoney)}
                </p>
                <p className={`font-num mt-0.5 text-lg font-medium ${tone}`}>
                    {formatSigned(calc.returnRate, formatPercent)}
                </p>
                <p className="mt-2 text-xs text-subtle">
                    {calc.hasAllQuotes
                        ? '已扣除每一筆的買賣手續費與證交稅'
                        : '有標的尚未取得報價，總計並不完整'}
                </p>
            </div>

            <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                className="mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5
                           border-t border-border py-2.5 text-xs text-muted-foreground
                           transition-colors duration-200 hover:bg-muted hover:text-foreground"
            >
                明細
                <ChevronDownIcon
                    className={`size-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open && (
                <dl className="divide-y divide-border border-t border-border bg-muted/40">
                    <Row label="買進成本" value={`${formatMoney(calc.totalCost)} 元`} />
                    <Row label="現在市值" value={`${formatMoney(calc.marketValue)} 元`} />
                    <Row
                        label="帳面價差"
                        hint="未扣費用"
                        value={`${formatSigned(calc.grossPnl, formatMoney)} 元`}
                    />
                    <Row label="交易成本" hint="來回" value={`-${formatMoney(calc.tradingCost)} 元`} />
                </dl>
            )}
        </section>
    )
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <div className="flex items-baseline justify-between gap-2 px-4 py-2.5">
            <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
                {label}
                {hint && <span className="text-xs text-subtle">{hint}</span>}
            </dt>
            <dd className="font-num text-sm font-medium">{value}</dd>
        </div>
    )
}
