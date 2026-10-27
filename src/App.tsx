import { useCallback, useEffect, useMemo, useState } from 'react'
import { FeeSettingsBar } from './components/FeeSettingsBar'
import { newLot, type LotInput } from './components/LotEditor'
import { PortfolioSummary } from './components/PortfolioSummary'
import { PositionCard } from './components/PositionCard'
import { SymbolSearch } from './components/SymbolSearch'
import { calculatePortfolio, type FeeSettings, type Position } from './lib/calc'
import { fetchQuotes, type Quote } from './lib/quote'
import { loadPositions, savePositions, type HeldPosition } from './lib/positions'
import { loadFees, saveFees } from './lib/settings'
import type { Market, Symbol } from './lib/symbols'
import { checkForUpdate, getRunningVersion, type UpdateState } from './lib/updater'

/** 編輯中的持倉：批次的數字以字串保存，使用者才能自由輸入小數點與千分位。 */
interface UiPosition {
    id: string
    code: string
    name: string
    market: Market
    lots: LotInput[]
}

function toUi(held: HeldPosition): UiPosition {
    const lots = held.lots.map((l) => ({
        id: crypto.randomUUID(),
        shares: String(l.shares),
        price: String(l.price),
    }))
    // 加入標的但還沒填數量就關掉 app 的話，存回來會是零個批次。永遠至少給一列，
    // 否則那張卡片重開之後連輸入框都沒有。
    return { ...held, lots: lots.length > 0 ? lots : [newLot()] }
}

function toHeld(position: UiPosition): HeldPosition {
    return {
        id: position.id,
        code: position.code,
        name: position.name,
        market: position.market,
        // 只存填完整的批次。沒填的會被 JSON.stringify 轉成 null，存了也讀不回來。
        lots: position.lots
            .map((l) => ({ shares: Number.parseFloat(l.shares), price: Number.parseFloat(l.price) }))
            .filter((l) => Number.isFinite(l.shares) && Number.isFinite(l.price)),
    }
}

function toCalc(position: UiPosition): Position {
    const held = toHeld(position)
    return { id: held.id, code: held.code, name: held.name, lots: held.lots }
}

export default function App() {
    const [positions, setPositions] = useState<UiPosition[]>(() => loadPositions().map(toUi))
    const [quotes, setQuotes] = useState<Map<string, Quote>>(new Map())
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [reloadToken, setReloadToken] = useState(0)
    const [notice, setNotice] = useState<string | null>(null)

    const [fees, setFees] = useState<FeeSettings>(() => loadFees())
    const [update, setUpdate] = useState<UpdateState>({ status: 'idle' })
    const [running, setRunning] = useState<string | null>(null)

    useEffect(() => {
        void checkForUpdate(setUpdate)
        void getRunningVersion().then(setRunning)
    }, [])

    /** 以代號清單當依賴，這樣只有「加入或移除標的」才會重新查價，改數量不會。 */
    const codesKey = positions.map((p) => `${p.market}_${p.code}`).join('|')

    useEffect(() => {
        const targets = positions.map((p) => ({ code: p.code, market: p.market }))
        if (targets.length === 0) {
            setQuotes(new Map())
            setError(null)
            setLoading(false)
            return
        }

        let cancelled = false
        const controller = new AbortController()
        setLoading(true)
        setError(null)

        // 證交所 MIS 的 ex_ch 可以串接多檔，所以不論幾檔都只發一個請求。
        fetchQuotes(targets, controller.signal)
            .then((next) => {
                if (cancelled) return
                setQuotes(next)
                const missing = targets.filter((t) => !next.has(t.code))
                if (missing.length > 0) {
                    setError(`查不到 ${missing.map((m) => m.code).join('、')} 的報價`)
                }
            })
            .catch((e: unknown) => {
                if (cancelled) return
                setQuotes(new Map())
                setError(e instanceof Error ? e.message : '取得報價失敗')
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })

        return () => {
            cancelled = true
            controller.abort()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [codesKey, reloadToken])

    const persist = useCallback((next: UiPosition[]) => {
        setPositions(next)
        savePositions(next.map(toHeld))
    }, [])

    function addSymbol(symbol: Symbol) {
        // 同一檔已經在清單裡就不重複加入，使用者該做的是在那張卡片裡再買一筆。
        // 但不能默默沒反應 —— 要講出來，否則看起來像壞掉。
        if (positions.some((p) => p.code === symbol.code)) {
            setNotice(`${symbol.name} 已經在清單裡，請在那張卡片裡「再買一筆」`)
            return
        }
        setNotice(null)
        persist([...positions, { id: crypto.randomUUID(), ...symbol, lots: [newLot()] }])
    }

    const calc = useMemo(() => {
        const prices = new Map([...quotes].map(([code, q]) => [code, q.price]))
        return calculatePortfolio(positions.map(toCalc), prices, fees)
    }, [positions, quotes, fees])

    return (
        <div className="mx-auto flex min-h-full max-w-xl flex-col gap-4 px-4 pb-16 pt-8">
            <header>
                <h1 className="page-title text-3xl">台股盈虧計算機</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                    加入手上的股票，算出整個組合一共賺了還是虧了
                </p>
            </header>

            {update.status === 'ready' && (
                <p className="rounded-lg border border-brand/40 bg-brand/10 px-4 py-2.5 text-sm">
                    已下載新版 {update.version}，下次開啟 app 就會生效
                </p>
            )}

            <SymbolSearch onSelect={addSymbol} />

            {notice && (
                <p className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground">
                    {notice}
                </p>
            )}

            {error && !loading && (
                <div className="rounded-lg border border-border bg-card px-4 py-3">
                    <p className="text-sm text-up">{error}</p>
                    <button
                        type="button"
                        onClick={() => setReloadToken((n) => n + 1)}
                        className="mt-1.5 cursor-pointer text-sm text-muted-foreground underline
                                   underline-offset-4 transition-colors duration-200 hover:text-foreground"
                    >
                        重新查詢
                    </button>
                </div>
            )}

            {positions.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center
                              text-sm text-muted-foreground">
                    先搜尋並加入一檔股票
                </p>
            ) : (
                <>
                    <PortfolioSummary calc={calc} />

                    <div className="space-y-3">
                        {positions.map((position) => (
                            <PositionCard
                                key={position.id}
                                code={position.code}
                                name={position.name}
                                lots={position.lots}
                                quote={quotes.get(position.code) ?? null}
                                loading={loading}
                                calc={calc.positions.find((c) => c.id === position.id)!}
                                onLotsChange={(lots) =>
                                    persist(positions.map((p) => (p.id === position.id ? { ...p, lots } : p)))
                                }
                                onRemove={() => persist(positions.filter((p) => p.id !== position.id))}
                            />
                        ))}
                    </div>

                    <FeeSettingsBar fees={fees} onChange={(next) => setFees(saveFees(next))} />
                </>
            )}

            {running && (
                <footer className="mt-auto pt-6 text-center text-xs text-subtle">版本 {running}</footer>
            )}
        </div>
    )
}
