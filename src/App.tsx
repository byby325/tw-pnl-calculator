import { useEffect, useMemo, useState } from 'react'
import { FeeSettingsBar } from './components/FeeSettingsBar'
import { LotEditor, newLot, type LotInput } from './components/LotEditor'
import { QuoteCard } from './components/QuoteCard'
import { RecentList } from './components/RecentList'
import { ResultPanel } from './components/ResultPanel'
import { SymbolSearch } from './components/SymbolSearch'
import { calculate, isEtfCode, type FeeSettings, type Lot } from './lib/calc'
import { fetchQuote, type Quote } from './lib/quote'
import { clearRecent, loadRecent, pushRecent } from './lib/recent'
import { loadFees, saveFees } from './lib/settings'
import { checkForUpdate, getRunningVersion, type UpdateState } from './lib/updater'
import type { Symbol } from './lib/symbols'

export default function App() {
    const [symbol, setSymbol] = useState<Symbol | null>(null)
    const [quote, setQuote] = useState<Quote | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    /** 遞增就重查一次，用於「重新查詢」。 */
    const [reloadToken, setReloadToken] = useState(0)

    const [lots, setLots] = useState<LotInput[]>([newLot()])
    const [recent, setRecent] = useState<Symbol[]>(() => loadRecent())
    const [fees, setFees] = useState<FeeSettings>(() => loadFees())
    const [update, setUpdate] = useState<UpdateState>({ status: 'idle' })
    const [running, setRunning] = useState<string | null>(null)

    useEffect(() => {
        void getRunningVersion().then(setRunning)
    }, [])

    // 開啟時在背景看看有沒有新版；失敗就安靜略過，不打擾正在計算的人。
    useEffect(() => {
        void checkForUpdate(setUpdate)
    }, [])

    useEffect(() => {
        if (!symbol) return

        // 每次執行都有自己的 cancelled，所以 StrictMode 的二次掛載不會讓第二個請求
        // 被第一個的清理影響，loading 一定會被最新那次請求關掉。
        let cancelled = false
        const controller = new AbortController()

        setQuote(null)
        setLoading(true)
        setError(null)

        fetchQuote(symbol.code, symbol.market, controller.signal)
            .then((next) => {
                if (cancelled) return
                setQuote(next)
                if (!next) setError('證交所查不到這檔的報價')
            })
            .catch((e: unknown) => {
                if (cancelled) return
                setQuote(null)
                setError(e instanceof Error ? e.message : '取得報價失敗')
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })

        return () => {
            cancelled = true
            controller.abort()
        }
    }, [symbol, reloadToken])

    function select(next: Symbol) {
        setSymbol(next)
        setRecent(pushRecent(next))
        // 再選一次同一檔時 symbol 的參考沒變，effect 不會重跑。遞增 token 強迫重查，
        // 順便讓「點已選的標的」等於重新整理報價。
        setReloadToken((n) => n + 1)
    }

    function updateFees(next: FeeSettings) {
        setFees(saveFees(next))
    }

    const isEtf = symbol ? isEtfCode(symbol.code) : false

    const calc = useMemo(() => {
        const parsed: Lot[] = lots.map((l) => ({
            shares: Number.parseFloat(l.shares),
            price: Number.parseFloat(l.price),
        }))
        return calculate(parsed, quote?.price ?? null, fees, isEtf)
    }, [lots, quote, fees, isEtf])

    return (
        <div className="mx-auto flex min-h-full max-w-xl flex-col gap-5 px-4 pb-16 pt-8">
            <header>
                <h1 className="page-title text-3xl">台股盈虧計算機</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                    查即時報價，算你手上的這檔是賺是虧
                </p>
            </header>

            {update.status === 'ready' && (
                <p className="rounded-lg border border-brand/40 bg-brand/10 px-4 py-2.5 text-sm text-foreground">
                    已下載新版 {update.version}，下次開啟 app 就會生效
                </p>
            )}

            <SymbolSearch onSelect={select} />

            <RecentList recent={recent} onSelect={select} onClear={() => setRecent(clearRecent())} />

            {loading && (
                <p className="rounded-lg border border-border bg-card px-4 py-6 text-center text-sm
                              text-muted-foreground">
                    查詢報價中…
                </p>
            )}

            {error && symbol && !loading && (
                <div className="rounded-lg border border-border bg-card px-4 py-4">
                    <p className="text-sm text-up">{error}</p>
                    <button
                        type="button"
                        onClick={() => setReloadToken((n) => n + 1)}
                        className="mt-2 cursor-pointer text-sm text-muted-foreground underline underline-offset-4
                                   transition-colors duration-200 hover:text-foreground"
                    >
                        重新查詢
                    </button>
                </div>
            )}

            {quote && !loading && <QuoteCard quote={quote} />}

            {symbol ? (
                <>
                    <LotEditor lots={lots} onChange={setLots} />
                    <FeeSettingsBar fees={fees} onChange={updateFees} />
                    <ResultPanel calc={calc} quotePrice={quote?.price ?? null} isEtf={isEtf} />
                </>
            ) : (
                <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm
                              text-muted-foreground">
                    先搜尋一檔股票
                </p>
            )}

            {running && (
                <footer className="mt-auto pt-6 text-center text-xs text-subtle">版本 {running}</footer>
            )}
        </div>
    )
}
