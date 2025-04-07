import * as fs from 'fs/promises'
import * as path from 'path'

const filename = 'font24.cpp'

const fontPath = path.join(import.meta.dir, '..', 'esp', 'lib', 'esp32-waveshare-epd', 'src', filename)
const data = await fs.readFile(fontPath, 'utf-8')
const fontData = data
  .split('_Table[]')[1]
  .split('{').slice(1).join('{')
  .split('};')[0]
  .replaceAll('\r', '')

const findRe = /@\d+ '(?<key>.)'.+?\n(?<raw>(.|\n)+?)(?=\/\/ @)/g
const results = fontData.matchAll(findRe)

const out = {} as any
for (const res of results) {
  const key = res.groups?.key
  const raw = res.groups?.raw
  if (!key || !raw) continue

  const value = raw
    .match(/0x[0-9a-fA-F]+/g)
    ?.join('')
    .split('0x')
    .map(e => e.trim())
    .filter(Boolean)
    .map(e => `0x${e}`)

  out[key] = value
}
console.log(out)
