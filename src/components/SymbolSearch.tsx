import { useEffect, useRef, useState } from 'react'
import { searchSymbols, type Symbol } from '../lib/symbols'
import { SearchIcon } from './icons'

interface Props {
    onSelect: (symbol: Symbol) => void
}

export function SymbolSearch({ onSelect }: Props) {
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const boxRef = useRef<HTMLDivElement>(null)

    const matches = searchSymbols(query)

    useEffect(() => {
        function onPointerDown(e: PointerEvent) {
            if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('pointerdown', onPointerDown)
        return () => document.removeEventListener('pointerdown', onPointerDown)
    }, [])

    function pick(symbol: Symbol) {
        onSelect(symbol)
        setQuery('')
        setOpen(false)
    }

    return (
        <div ref={boxRef} className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value)
                    setOpen(true)
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && matches.length > 0) pick(matches[0])
                    if (e.key === 'Escape') setOpen(false)
                }}
                placeholder="股票代號或名稱"
                aria-label="搜尋股票代號或名稱"
                className="w-full rounded-lg border border-input-border bg-card py-3 pl-10 pr-3 text-foreground
                           outline-none transition-colors duration-200
                           placeholder:text-muted-foreground focus:border-brand"
                autoComplete="off"
                enterKeyHint="search"
            />

            {open && matches.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border
                               bg-card shadow-lg">
                    {matches.map((s) => (
                        <li key={s.code}>
                            <button
                                type="button"
                                onClick={() => pick(s)}
                                className="flex w-full cursor-pointer items-center gap-3 px-3 py-3 text-left
                                           transition-colors duration-200 hover:bg-muted"
                            >
                                <span className="font-num font-medium">{s.code}</span>
                                <span className="truncate text-muted-foreground">{s.name}</span>
                                <span className="ml-auto shrink-0 text-xs text-subtle">
                                    {s.market === 'tse' ? '上市' : '上櫃'}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
