import { useEffect, useRef, useState } from 'react'
import { formatMoney } from '../lib/calc'
import { PlusIcon, TrashIcon } from './icons'

export interface LotInput {
    id: string
    shares: string
    price: string
}

interface Props {
    lots: LotInput[]
    onChange: (lots: LotInput[]) => void
}

export function newLot(): LotInput {
    return { id: crypto.randomUUID(), shares: '', price: '' }
}

/** 千分位只在欄位失焦時顯示；編輯中保持原樣，游標才不會被插入的逗號擠走。 */
function withThousands(raw: string): string {
    if (!raw) return ''
    const [whole, ...decimals] = raw.split('.')
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return decimals.length > 0 ? `${grouped}.${decimals.join('')}` : grouped
}

export function LotEditor({ lots, onChange }: Props) {
    const sharesInputs = useRef(new Map<string, HTMLInputElement>())
    const [focusId, setFocusId] = useState<string | null>(null)

    // 新增一列之後把游標送進去，使用者不必再點一次。
    useEffect(() => {
        if (!focusId) return
        sharesInputs.current.get(focusId)?.focus()
        setFocusId(null)
    }, [focusId])

    function update(id: string, patch: Partial<LotInput>) {
        onChange(lots.map((l) => (l.id === id ? { ...l, ...patch } : l)))
    }

    function addLot() {
        const lot = newLot()
        onChange([...lots, lot])
        setFocusId(lot.id)
    }

    const canRemove = lots.length > 1

    return (
        <section>
            <h2 className="mb-2 text-xs text-muted-foreground">買進批次　分批買就多加幾列</h2>

            <div className="overflow-hidden rounded-lg border border-border bg-card">
                {/* 可見的欄位標籤：填值之後 placeholder 會消失，只靠它當標籤是不夠的。 */}
                <div className="flex gap-3 border-b border-border px-3 py-2 text-xs text-subtle">
                    <span className="flex-1 pr-7 text-right">股數</span>
                    <span className="flex-1 pr-7 text-right">買進價</span>
                    {canRemove && <span className="w-11 shrink-0" aria-hidden />}
                </div>

                <div className="divide-y divide-border">
                    {lots.map((lot, index) => {
                        const shares = Number.parseFloat(lot.shares)
                        const price = Number.parseFloat(lot.price)
                        const subtotal =
                            Number.isFinite(shares) && Number.isFinite(price) && shares > 0 && price > 0
                                ? shares * price
                                : null

                        return (
                            <div key={lot.id} className="px-3 py-2">
                                <div className="flex items-center gap-3">
                                    <NumericField
                                        value={lot.shares}
                                        onChange={(v) => update(lot.id, { shares: v })}
                                        label={`第 ${index + 1} 列股數`}
                                        suffix="股"
                                        inputRef={(el) => {
                                            if (el) sharesInputs.current.set(lot.id, el)
                                            else sharesInputs.current.delete(lot.id)
                                        }}
                                    />
                                    <NumericField
                                        value={lot.price}
                                        onChange={(v) => update(lot.id, { price: v })}
                                        label={`第 ${index + 1} 列買進價`}
                                        suffix="元"
                                    />
                                    {canRemove && (
                                        <button
                                            type="button"
                                            onClick={() => onChange(lots.filter((l) => l.id !== lot.id))}
                                            aria-label={`刪除第 ${index + 1} 列批次`}
                                            className="flex size-11 shrink-0 cursor-pointer items-center justify-center
                                                       rounded-lg text-subtle transition-colors duration-200
                                                       hover:bg-muted hover:text-foreground"
                                        >
                                            <TrashIcon className="size-4" />
                                        </button>
                                    )}
                                </div>

                                {/*
                                  * 小計只在兩欄都填好才出現，但這一行永遠佔著固定高度，
                                  * 不然填到一半時整張卡片會上下跳。
                                  */}
                                <p
                                    className={`font-num mt-0.5 h-4 text-right text-xs leading-4 text-subtle ${canRemove ? 'pr-14' : 'pr-7'}`}
                                >
                                    {subtotal != null && `小計 ${formatMoney(subtotal)} 元`}
                                </p>
                            </div>
                        )
                    })}
                </div>

                <button
                    type="button"
                    onClick={addLot}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 border-t border-border
                               py-3 text-sm text-muted-foreground transition-colors duration-200
                               hover:bg-muted hover:text-foreground"
                >
                    <PlusIcon className="size-4" />
                    新增批次
                </button>
            </div>
        </section>
    )
}

interface NumericFieldProps {
    value: string
    onChange: (value: string) => void
    label: string
    suffix: string
    inputRef?: (el: HTMLInputElement | null) => void
}

function NumericField({ value, onChange, label, suffix, inputRef }: NumericFieldProps) {
    const [focused, setFocused] = useState(false)

    return (
        <div className="relative flex-1">
            <input
                ref={inputRef}
                value={focused ? value : withThousands(value)}
                // 數字鍵盤，但型別留 text 才不會在 Android 上擋掉小數點與千分位
                inputMode="decimal"
                aria-label={label}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))}
                // 靜止狀態就要有看得見的邊框：觸控裝置沒有 hover，原本的 border-transparent
                // 在手機上等於沒有欄位邊界。input-border 的亮度是對著 WCAG 1.4.11 的 3:1 設的。
                className="font-num w-full rounded-lg border border-input-border bg-background py-2.5 pl-2 pr-7
                           text-right text-foreground transition-colors duration-200
                           focus:border-brand focus:ring-1 focus:ring-brand"
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-subtle">
                {suffix}
            </span>
        </div>
    )
}
