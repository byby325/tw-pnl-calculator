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

/**
 * 一檔標的的買進批次清單。每一列都是一張獨立的委託單，手續費也是各自計算
 * （見 lib/calc.ts），所以分幾列輸入會影響算出來的費用。
 */
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
        <div>
            {/* 可見的欄位標籤：填值之後 placeholder 會消失，只靠它當標籤是不夠的。 */}
            <div className="flex gap-2 pb-1.5 text-xs text-subtle">
                <span className="flex-1 pr-7 text-right">股數</span>
                <span className="flex-1 pr-7 text-right">買進價</span>
                {canRemove && <span className="w-9 shrink-0" aria-hidden />}
            </div>

            <div className="space-y-2">
                {lots.map((lot, index) => {
                    const shares = Number.parseFloat(lot.shares)
                    const price = Number.parseFloat(lot.price)
                    const subtotal =
                        Number.isFinite(shares) && Number.isFinite(price) && shares > 0 && price > 0
                            ? shares * price
                            : null

                    return (
                        <div key={lot.id}>
                            <div className="flex items-center gap-2">
                                <NumericField
                                    value={lot.shares}
                                    onChange={(v) => update(lot.id, { shares: v })}
                                    label={`第 ${index + 1} 筆股數`}
                                    suffix="股"
                                    inputRef={(el) => {
                                        if (el) sharesInputs.current.set(lot.id, el)
                                        else sharesInputs.current.delete(lot.id)
                                    }}
                                />
                                <NumericField
                                    value={lot.price}
                                    onChange={(v) => update(lot.id, { price: v })}
                                    label={`第 ${index + 1} 筆買進價`}
                                    suffix="元"
                                />
                                {canRemove && (
                                    <button
                                        type="button"
                                        onClick={() => onChange(lots.filter((l) => l.id !== lot.id))}
                                        aria-label={`刪除第 ${index + 1} 筆`}
                                        className="flex size-9 shrink-0 cursor-pointer items-center justify-center
                                                   rounded-lg text-subtle transition-colors duration-200
                                                   hover:bg-muted hover:text-foreground"
                                    >
                                        <TrashIcon className="size-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* 這一行永遠佔固定高度，不然填到一半時版面會上下跳。 */}
                            <p
                                className={`font-num mt-0.5 h-4 text-right text-xs leading-4 text-subtle
                                            ${canRemove ? 'pr-11' : 'pr-7'}`}
                            >
                                {subtotal != null && `${formatMoney(subtotal)} 元`}
                            </p>
                        </div>
                    )
                })}
            </div>

            <button
                type="button"
                onClick={addLot}
                className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg
                           border border-dashed border-border py-2 text-xs text-muted-foreground
                           transition-colors duration-200 hover:border-brand hover:text-foreground"
            >
                <PlusIcon className="size-3.5" />
                再買一筆
            </button>
        </div>
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
                className="font-num w-full rounded-lg border border-input-border bg-background py-2 pl-2 pr-7
                           text-right text-foreground transition-colors duration-200
                           focus:border-brand focus:ring-1 focus:ring-brand"
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-subtle">
                {suffix}
            </span>
        </div>
    )
}
