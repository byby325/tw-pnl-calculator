/**
 * 打包一份 OTA 熱更新產物：網頁 bundle 的 zip，加上一份指向它的 manifest。
 *
 * 兩個檔案都是靜態的，放到任何能給 HTTPS 網址的地方即可，不需要伺服器端程式。
 * 版本號取自 package.json 的 version，每次要發新版就先把它加上去。
 *
 *   OTA_BASE_URL=https://example.com/ota node scripts/build-ota.mjs
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))

const baseUrl = process.env.OTA_BASE_URL?.replace(/\/+$/, '')
if (!baseUrl) {
    console.error('缺少 OTA_BASE_URL，例如 OTA_BASE_URL=https://example.com/ota')
    process.exit(1)
}

const releaseDir = resolve(root, 'release')
const zipName = `${version}.zip`
const zipPath = resolve(releaseDir, zipName)

execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' })

rmSync(zipPath, { force: true })
mkdirSync(releaseDir, { recursive: true })

// 從 dist 裡面打包，讓 index.html 落在 zip 的根目錄 —— 外掛要求 bundle 根目錄要有 index.html。
execFileSync('zip', ['-rq', zipPath, '.'], { cwd: resolve(root, 'dist'), stdio: 'inherit' })

writeFileSync(
    resolve(releaseDir, 'version.json'),
    `${JSON.stringify({ version, url: `${baseUrl}/${zipName}` }, null, 2)}\n`,
)

console.log(`\nOTA 產物已就緒（release/）`)
console.log(`  ${zipName}`)
console.log(`  version.json → ${baseUrl}/${zipName}`)
console.log(`\n把這兩個檔案上傳到 ${baseUrl}/ 即可，使用者下次開啟 app 會拿到 ${version}。`)
