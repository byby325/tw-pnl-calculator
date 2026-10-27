/** 一次買進的紀錄：股數與每股買進價格。 */
export interface Lot {
    shares: number
    price: number
}

export interface FeeSettings {
    /** 券商手續費折扣，1 表示不打折，0.6 表示六折。 */
    discount: number
    /** 券商單筆最低手續費，元。多數券商是 20，部分電子下單低到 1。 */
    minimumFee: number
}

/** 電子下單六折是台股最常見的條件，最低 20 元。使用者可以自己改。 */
export const DEFAULT_FEES: FeeSettings = { discount: 0.6, minimumFee: 20 }

/** 證券經紀商手續費率，買進與賣出各收一次。 */
const BROKER_FEE_RATE = 0.001425
/** 證券交易稅只在賣出時課徵；一般股票 0.3%，ETF 0.1%。 */
const TAX_RATE_STOCK = 0.003
const TAX_RATE_ETF = 0.001

/** 代號 00 開頭的是 ETF，證交稅率較低。 */
export function isEtfCode(code: string): boolean {
    return code.startsWith('00')
}

export interface Calculation {
    totalShares: number
    /** 不含手續費的買進金額。 */
    totalCost: number
    /** 加權平均的每股買進價格；總股數為 0 時是 0。 */
    avgCost: number
    marketValue: number
    /** 市值 − 買進成本，還沒扣掉任何交易成本。 */
    grossPnl: number
    buyFee: number
    sellFee: number
    tax: number
    /** 買進手續費 + 賣出手續費 + 證交稅，也就是現在賣掉的來回成本。 */
    tradingCost: number
    /** 扣掉交易成本後真正落袋的金額。 */
    pnl: number
    /** 盈虧 ÷（買進成本 + 買進手續費），也就是對實際投入金額的報酬率。 */
    returnRate: number
}

/** 只有股數與價格都是正數的批次才納入計算，使用者輸入到一半的空列要忽略。 */
export function isUsableLot(lot: Lot): boolean {
    return Number.isFinite(lot.shares) && lot.shares > 0 && Number.isFinite(lot.price) && lot.price > 0
}

/**
 * 金額為 0 時不收費，否則至少收最低手續費。
 * 券商實務上手續費算到元為止、小數無條件捨去，取整也讓明細加起來剛好等於總計。
 */
function brokerFee(amount: number, fees: FeeSettings): number {
    if (amount <= 0) return 0
    return Math.max(Math.floor(amount * BROKER_FEE_RATE * fees.discount), fees.minimumFee)
}

/**
 * 以報價計算多個批次合併後的盈虧。
 *
 * 交易成本採「現在全部賣掉」的來回成本：買進時已經付掉的手續費，加上假設此刻賣出
 * 要付的手續費與證交稅。只扣買進手續費會讓數字看起來比實際好。
 *
 * 買進手續費逐筆計算 —— 每一筆買進都是一張獨立的委託單，各自適用最低收費。把同一
 * 檔的批次加總後才算費用，會讓小額批次的最低收費被吃掉。賣出則假設整個部位一次賣
 * 出，算一筆委託。
 *
 * 報價為 null（還沒查到）時市值、盈虧、賣出成本都是 0，但買進成本仍然算得出來。
 */
export function calculate(
    lots: Lot[],
    quotePrice: number | null,
    fees: FeeSettings,
    isEtf: boolean,
): Calculation {
    const usable = lots.filter(isUsableLot)

    const totalShares = usable.reduce((sum, l) => sum + l.shares, 0)
    const totalCost = usable.reduce((sum, l) => sum + l.shares * l.price, 0)
    const avgCost = totalShares > 0 ? totalCost / totalShares : 0

    const marketValue = quotePrice != null ? quotePrice * totalShares : 0

    const buyFee = usable.reduce((sum, lot) => sum + brokerFee(lot.shares * lot.price, fees), 0)
    const sellFee = brokerFee(marketValue, fees)
    const tax = Math.round(marketValue * (isEtf ? TAX_RATE_ETF : TAX_RATE_STOCK))

    const hasQuote = quotePrice != null && totalShares > 0
    const grossPnl = hasQuote ? marketValue - totalCost : 0
    const tradingCost = hasQuote ? buyFee + sellFee + tax : buyFee
    const pnl = hasQuote ? grossPnl - tradingCost : 0

    const invested = totalCost + buyFee
    const returnRate = hasQuote && invested > 0 ? pnl / invested : 0

    return {
        totalShares, totalCost, avgCost, marketValue,
        grossPnl, buyFee, sellFee, tax, tradingCost, pnl, returnRate,
    }
}

const money = new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 })
const price = new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatMoney = (n: number) => money.format(Math.round(n))
export const formatPrice = (n: number) => price.format(n)
export const formatShares = (n: number) => money.format(n)

/** 盈虧與報酬率一律帶正負號，零不加號。 */
export function formatSigned(n: number, format: (n: number) => string): string {
    if (n > 0) return `+${format(n)}`
    if (n < 0) return `-${format(Math.abs(n))}`
    return format(0)
}

export function formatPercent(rate: number): string {
    return `${(rate * 100).toFixed(2)}%`
}

/** 一檔標的的持倉：一個股票代號加上它的所有買進批次。 */
export interface Position {
    id: string
    code: string
    name: string
    lots: Lot[]
}

/** 單一持倉的計算結果，附帶它是哪一檔。 */
export interface PositionCalculation extends Calculation {
    id: string
    code: string
    name: string
    /** 該檔的報價；還沒查到時是 null。 */
    quotePrice: number | null
}

export interface PortfolioCalculation {
    positions: PositionCalculation[]
    /** 有填入可用批次的持倉數量。 */
    fundedCount: number
    /** 這些持倉是否全都已經取得報價；只要有一檔沒有，總計就不完整。 */
    hasAllQuotes: boolean
    totalCost: number
    marketValue: number
    grossPnl: number
    tradingCost: number
    pnl: number
    returnRate: number
}

/**
 * 計算整個組合。
 *
 * 關鍵在於每一檔都各自跑一次 `calculate` 再加總，而不是把總成本丟進同一個公式。
 * 券商手續費的最低收費是「每筆交易」計算的，買五檔就是五筆，各自適用最低收費；
 * 用組合總額去算會把小部位的手續費嚴重低估。證交稅率也要逐檔判斷是不是 ETF。
 *
 * 報價以代號查表帶入，查不到的那一檔只算得出成本，不計入市值與盈虧。
 */
export function calculatePortfolio(
    positions: Position[],
    quotePrices: Map<string, number>,
    fees: FeeSettings,
): PortfolioCalculation {
    const results = positions.map<PositionCalculation>((position) => {
        const quotePrice = quotePrices.get(position.code) ?? null
        return {
            id: position.id,
            code: position.code,
            name: position.name,
            quotePrice,
            ...calculate(position.lots, quotePrice, fees, isEtfCode(position.code)),
        }
    })

    const funded = results.filter((r) => r.totalShares > 0)
    const sum = (pick: (r: PositionCalculation) => number) =>
        funded.reduce((total, r) => total + pick(r), 0)

    const totalCost = sum((r) => r.totalCost)
    const tradingCost = sum((r) => r.tradingCost)
    const pnl = sum((r) => r.pnl)
    const invested = totalCost + sum((r) => r.buyFee)

    return {
        positions: results,
        fundedCount: funded.length,
        hasAllQuotes: funded.length > 0 && funded.every((r) => r.quotePrice != null),
        totalCost,
        marketValue: sum((r) => r.marketValue),
        grossPnl: sum((r) => r.grossPnl),
        tradingCost,
        pnl,
        returnRate: invested > 0 ? pnl / invested : 0,
    }
}
