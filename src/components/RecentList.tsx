import type { Symbol } from '../lib/symbols'

interface Props {
    recent: Symbol[]
    onSelect: (symbol: Symbol) => void
    onClear: () => void
}

export function RecentList({ recent, onSelect, onClear }: Props) {
    if (recent.length === 0) return null

    return (
        <section>
            <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs text-muted-foreground">最近查詢</h2>
                <button
                    type="button"
                    onClick={onClear}
                    className="cursor-pointer text-xs text-subtle transition-colors duration-200
                               hover:text-foreground"
                >
                    清除
                </button>
            </div>
            <div className="flex flex-wrap gap-2">
                {recent.map((s) => (
                    <button
                        key={s.code}
                        type="button"
                        onClick={() => onSelect(s)}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-border
                                   bg-card px-3 py-2 text-sm transition-colors duration-200 hover:bg-muted"
                    >
                        <span className="font-num font-medium">{s.code}</span>
                        <span className="text-muted-foreground">{s.name}</span>
                    </button>
                ))}
            </div>
        </section>
    )
}
