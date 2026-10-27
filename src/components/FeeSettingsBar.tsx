import { useState } from 'react'
import type { FeeSettings } from '../lib/calc'
import { ChevronDownIcon } from './icons'

interface Props {
    fees: FeeSettings
    onChange: (fees: FeeSettings) => void
}

export function FeeSettingsBar({ fees, onChange }: Props) {
    const [open, setOpen] = useState(false)

    return (
        <section className="overflow-hidden rounded-lg border border-border bg-card">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-3 text-left
                           transition-colors duration-200 hover:bg-muted"
            >
                <span className="text-sm text-muted-foreground">手續費設定</span>
                <span className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{formatDiscount(fees.discount)}</span>
                    <span className="text-subtle">
                        最低 <span className="font-num">{fees.minimumFee}</span> 元
                    </span>
                    <ChevronDownIcon
                        className={`size-4 text-subtle transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    />
                </span>
            </button>

            {open && (
                <div className="space-y-4 border-t border-border px-4 py-4">
                    <NumberField
                        label="券商折扣"
                        hint="六折填 0.6，不打折填 1"
                        value={fees.discount}
                        onChange={(discount) => onChange({ ...fees, discount })}
                    />
                    <NumberField
                        label="最低手續費"
                        hint="多數券商 20 元，部分電子下單 1 元"
                        value={fees.minimumFee}
                        onChange={(minimumFee) => onChange({ ...fees, minimumFee })}
                    />
                    <p className="text-xs leading-relaxed text-subtle">
                        券商手續費率固定 0.1425%，買賣各收一次。證交稅只在賣出時課，一般股票 0.3%、ETF 0.1%。
                    </p>
                </div>
            )}
        </section>
    )
}

function formatDiscount(discount: number): string {
    if (discount >= 1) return '不打折'
    const tenths = discount * 10
    return `${tenths.toFixed(tenths % 1 === 0 ? 0 : 1)} 折`
}

interface NumberFieldProps {
    label: string
    hint: string
    value: number
    onChange: (value: number) => void
}

function NumberField({ label, hint, value, onChange }: NumberFieldProps) {
    const [draft, setDraft] = useState(String(value))

    return (
        <div>
            <label className="block text-sm">
                {label}
                <input
                    value={draft}
                    inputMode="decimal"
                    onChange={(e) => {
                        const next = e.target.value.replace(/[^\d.]/g, '')
                        setDraft(next)
                        const parsed = Number.parseFloat(next)
                        if (Number.isFinite(parsed)) onChange(parsed)
                    }}
                    onBlur={() => setDraft(String(value))}
                    className="font-num mt-1.5 w-full rounded-lg border border-input-border bg-background px-3 py-3
                               text-foreground outline-none transition-colors duration-200 focus:border-brand"
                />
            </label>
            <p className="mt-1.5 text-xs text-subtle">{hint}</p>
        </div>
    )
}
