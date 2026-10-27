import { formatPercent, formatPrice, formatSigned } from '../lib/calc'
import type { Quote } from '../lib/quote'

interface Props {
    quote: Quote
}

export function QuoteCard({ quote }: Props) {
    const change = quote.price - quote.prevClose
    const changeRate = quote.prevClose > 0 ? change / quote.prevClose : 0
    // 台股漲紅跌綠，和多數國家相反。
    const tone = change > 0 ? 'text-up' : change < 0 ? 'text-down' : 'text-muted-foreground'

    return (
        <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-baseline gap-2">
                <h2 className="text-lg font-semibold">{quote.name}</h2>
                <span className="font-num text-sm text-muted-foreground">{quote.code}</span>
            </div>

            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className={`font-num text-3xl font-semibold ${tone}`}>
                    {formatPrice(quote.price)}
                </span>
                <span className={`font-num text-sm ${tone}`}>
                    {formatSigned(change, formatPrice)}（{formatSigned(changeRate, formatPercent)}）
                </span>
            </div>

            <p className="mt-2 text-xs text-subtle">
                {quote.isLive ? `${quote.at || '盤中'} 成交` : '今日尚未成交，顯示上一交易日收盤'}
            </p>
        </section>
    )
}
