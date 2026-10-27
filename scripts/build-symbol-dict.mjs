/**
 * 產出股票代號字典，供 app 在離線時解析代號、判斷上市或上櫃。
 *
 * 證交所與櫃買中心的收盤端點本身更新有延遲（見 ADR-0010 實測補充），但代號與
 * 名稱幾乎不變，所以這份字典在建置時產生一次、進版控，執行期不再連網。
 * 代號不一定是純數字，主動式 ETF 會出現 00400A 這種形式。
 *
 *   node scripts/build-symbol-dict.mjs
 */
import { writeFile } from 'node:fs/promises';

const TWSE = 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL';
const TPEX = 'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes';
const OUT = new URL('../src/data/symbols.json', import.meta.url);

async function getJson(url) {
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
        signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`${url} 回應 ${res.status}`);
    return res.json();
}

const [twse, tpex] = await Promise.all([getJson(TWSE), getJson(TPEX)]);

const rows = [
    ...twse.map((r) => ({ code: r.Code?.trim(), name: r.Name?.trim(), market: 'tse' })),
    ...tpex.map((r) => ({ code: r.SecuritiesCompanyCode?.trim(), name: r.CompanyName?.trim(), market: 'otc' })),
].filter((r) => r.code && r.name);

// 同一代號理論上不會橫跨兩個市場，但真的撞到就讓上市優先，行為才可預測。
const byCode = new Map();
for (const row of rows) if (!byCode.has(row.code)) byCode.set(row.code, row);

const dict = [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
await writeFile(OUT, JSON.stringify(dict), 'utf8');

const tse = dict.filter((r) => r.market === 'tse').length;
console.log(`寫入 ${dict.length} 檔（上市 ${tse}、上櫃 ${dict.length - tse}）→ src/data/symbols.json`);
