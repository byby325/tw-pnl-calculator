import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FeeSettingsBar } from './components/FeeSettingsBar'
import { newLot, type LotInput } from './components/LotEditor'
import { PortfolioSummary } from './components/PortfolioSummary'
import { PositionCard } from './components/PositionCard'
import { SymbolSearch } from './components/SymbolSearch'
import {
    calculatePortfolio, type FeeSettings, type PortfolioCalculation, type Position,
} from './lib/calc'
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

/** 輸入的指紋。變了就代表上次算出來的結果已經不對應現在的輸入。 */
function fingerprint(positions: UiPosition[], fees: FeeSettings): string {
    return JSON.stringify([
        positions.map((p) => [p.code, p.lots.map((l) => [l.shares, l.price])]),
        fees.discount,
        fees.minimumFee,
    ])
}

export default function App() {
    const [positions, setPositions] = useState<UiPosition[]>(() => loadPositions().map(toUi))
    const [fees, setFees] = useState<FeeSettings>(() => loadFees())
    const [quotes, setQuotes] = useState<Map<string, Quote>>(new Map())

    /** 上次按下計算時的結果，連同當時的輸入指紋與報價時間。 */
    const [result, setResult] = useState<PortfolioCalculation | null>(null)
    const [resultKey, setResultKey] = useState<string | null>(null)
    const [quotedAt, setQuotedAt] = useState<string | null>(null)

    const [calculating, setCalculating] = useState(false)
    const [loadingQuotes, setLoadingQuotes] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [notice, setNotice] = useState<string | null>(null)

    const [update, setUpdate] = useState<UpdateState>({ status: 'idle' })
    const [running, setRunning] = useState<string | null>(null)
    const resultRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        void checkForUpdate(setUpdate)
        void getRunningVersion().then(setRunning)
    }, [])

    /** 以代號清單當依賴，只有加入或移除標的才重新查價，改數量不會。 */
    const codesKey = positions.map((p) => `${p.market}_${p.code}`).join('|')

    // 加入標的時先抓一次報價，讓卡片上立刻看得到現價；這不會算盈虧，
    // 盈虧一律等使用者按下計算（ADR-0018）。
    useEffect(() => {
        const targets = positions.map((p) => ({ code: p.code, market: p.market }))
        if (targets.length === 0) {
            setQuotes(new Map())
            return
        }

        let cancelled = false
        const controller = new AbortController()
        setLoadingQuotes(true)

        fetchQuotes(targets, controller.signal)
            .then((next) => {
                if (!cancelled) setQuotes(next)
            })
            .catch(() => {
                // 這裡失敗只是卡片上看不到現價，按下計算時會再試一次並回報錯誤。
            })
            .finally(() => {
                if (!cancelled) setLoadingQuotes(false)
            })

        return () => {
            cancelled = true
            controller.abort()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [codesKey])

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

    /** 不需要報價就算得出來的部分，隨輸入即時更新，用來顯示每檔的股數與均價。 */
    const live = useMemo(
        () => calculatePortfolio(positions.map(toCalc), new Map(), fees),
        [positions, fees],
    )

    const inputKey = fingerprint(positions, fees)
    const stale = result != null && inputKey !== resultKey
    const canCalculate = live.fundedCount > 0 && !calculating

    /** 重新抓一次報價再計算，所以按下去拿到的一定是當下的價，不是進場時查的。 */
    async function calculate() {
        setCalculating(true)
        setError(null)
        setNotice(null)

        try {
            const targets = positions.map((p) => ({ code: p.code, market: p.market }))
            const fresh = await fetchQuotes(targets)
            setQuotes(fresh)

            const prices = new Map([...fresh].map(([code, q]) => [code, q.price]))
            setResult(calculatePortfolio(positions.map(toCalc), prices, fees))
            setResultKey(inputKey)
            setQuotedAt([...fresh.values()][0]?.at || null)

            const missing = targets.filter((t) => !fresh.has(t.code))
            if (missing.length > 0) {
                setError(`查不到 ${missing.map((m) => m.code).join('、')} 的報價，總計不含這幾檔`)
            }

            requestAnimationFrame(() =>
                resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
            )
        } catch (e) {
            setError(e instanceof Error ? e.message : '取得報價失敗')
        } finally {
            setCalculating(false)
        }
    }

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

            {positions.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center
                              text-sm text-muted-foreground">
                    先搜尋並加入一檔股票
                </p>
            ) : (
                <>
                    <div className="space-y-3">
                        {positions.map((position) => (
                            <PositionCard
                                key={position.id}
                                code={position.code}
                                name={position.name}
                                lots={position.lots}
                                quote={quotes.get(position.code) ?? null}
                                loading={loadingQuotes}
                                live={live.positions.find((c) => c.id === position.id)!}
                                result={result?.positions.find((c) => c.id === position.id) ?? null}
                                stale={stale}
                                onLotsChange={(lots) =>
                                    persist(positions.map((p) => (p.id === position.id ? { ...p, lots } : p)))
                                }
                                onRemove={() => persist(positions.filter((p) => p.id !== position.id))}
                            />
                        ))}
                    </div>

                    <FeeSettingsBar fees={fees} onChange={(next) => setFees(saveFees(next))} />

                    <button
                        type="button"
                        onClick={() => void calculate()}
                        disabled={!canCalculate}
                        className="cursor-pointer rounded-lg bg-brand px-4 py-4 text-base font-medium
                                   text-background transition-opacity duration-200 hover:opacity-90
                                   disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {calculating ? '計算中…' : stale ? '重新計算' : '計算組合總盈虧'}
                    </button>

                    {live.fundedCount === 0 && (
                        <p className="text-center text-xs text-subtle">填入股數與買進價才能計算</p>
                    )}

                    {error && (
                        <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-up">
                            {error}
                        </p>
                    )}

                    <div ref={resultRef}>
                        {result && (
                            <PortfolioSummary calc={result} quotedAt={quotedAt} stale={stale} />
                        )}
                    </div>
                </>
            )}

            {running && (
                <footer className="mt-auto pt-6 text-center text-xs text-subtle">版本 {running}</footer>
            )}
        </div>
    )
}
