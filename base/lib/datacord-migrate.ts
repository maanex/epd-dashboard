import * as fs from 'fs/promises'
import * as path from 'path'
import { Database } from 'bun:sqlite'
import consola from 'consola'
import { Const } from './const'

const CREDENTIALS_DIR = path.join(import.meta.dirname, '..', '..', 'credentials')
const JSON_PATH = path.join(CREDENTIALS_DIR, 'datacord.json')
const TOTD_JSON_PATH = path.join(CREDENTIALS_DIR, 'totd.json')
const SQLITE_PATH = path.join(CREDENTIALS_DIR, 'datacord.sqlite')
const CACHE_DIR = path.join(CREDENTIALS_DIR, 'cache')
const ARCHIVE_DIR = path.join(CREDENTIALS_DIR, 'archive')

function formatDateId(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

async function fileExists(filePath: string): Promise<boolean> {
  return fs.stat(filePath).then(() => true).catch(() => false)
}

export async function migrateDatacordIfNeeded() {
  const hasSqlite = await fileExists(SQLITE_PATH)
  if (hasSqlite)
    return

  const hasJson = await fileExists(JSON_PATH)
  if (!hasJson)
    return

  consola.start('Migrating datacord.json to datacord.sqlite...')

  const rawJson = await fs.readFile(JSON_PATH, 'utf-8')
  const data = JSON.parse(rawJson || '{}') as {
    candidates?: Array<{
      id: string
      author: string
      authorId: string
      text?: string
      image?: string
    }>
    userWins?: Record<string, number>
  }

  const db = new Database(SQLITE_PATH, { create: true })
  db.run(`
    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      author TEXT NOT NULL,
      author_id TEXT NOT NULL,
      text TEXT,
      fullscreen INTEGER NOT NULL
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS winners (
      id TEXT PRIMARY KEY,
      author TEXT NOT NULL,
      author_id TEXT NOT NULL,
      text TEXT,
      fullscreen INTEGER NOT NULL,
      upvotes INTEGER NOT NULL,
      downvotes INTEGER NOT NULL,
      score REAL NOT NULL
    )
  `)

  const insertCandidate = db.prepare(`
    INSERT OR REPLACE INTO candidates (id, author, author_id, text, fullscreen)
    VALUES ($id, $author, $authorId, $text, $fullscreen)
  `)

  for (const c of data.candidates ?? []) {
    const hasImage = Boolean(c.image)
    const isFullscreen = Boolean(c.text && Const.FullscreenTriggerWords.includes(c.text.toLowerCase()))

    insertCandidate.run({
      $id: c.id,
      $author: c.author,
      $authorId: c.authorId,
      $text: hasImage ? null : (c.text ?? ''),
      $fullscreen: isFullscreen ? 1 : 0,
    })

    if (c.image && c.image !== `${c.id}.png`) {
      const oldImgPath = path.join(CACHE_DIR, c.image)
      const newImgPath = path.join(CACHE_DIR, `${c.id}.png`)
      if (await fileExists(oldImgPath)) {
        await fs.rename(oldImgPath, newImgPath).catch(consola.error)
      }
    }
  }

  if (await fileExists(TOTD_JSON_PATH)) {
    const rawTotd = await fs.readFile(TOTD_JSON_PATH, 'utf-8').catch(() => null)
    const totd = rawTotd ? JSON.parse(rawTotd) : null
    if (totd && totd.author && totd.authorId) {
      const activeDate = new Date(Date.now() - (3 * 60 + 30) * 60 * 1000)
      const dateId = formatDateId(activeDate)
      const hasImage = Boolean(totd.image)
      const isFullscreen = Boolean(totd.text && Const.FullscreenTriggerWords.includes(totd.text.toLowerCase()))

      if (hasImage) {
        await fs.mkdir(ARCHIVE_DIR, { recursive: true })
        const srcImg = path.join(CACHE_DIR, totd.image)
        const dstImg = path.join(ARCHIVE_DIR, `${dateId}.png`)
        if (await fileExists(srcImg)) {
          await fs.copyFile(srcImg, dstImg).catch(consola.error)
        }
      }

      db.prepare(`
        INSERT OR REPLACE INTO winners (id, author, author_id, text, fullscreen, upvotes, downvotes, score)
        VALUES ($id, $author, $authorId, $text, $fullscreen, $upvotes, $downvotes, $score)
      `).run({
        $id: dateId,
        $author: totd.author,
        $authorId: totd.authorId,
        $text: hasImage ? null : (totd.text ?? ''),
        $fullscreen: isFullscreen ? 1 : 0,
        $upvotes: 0,
        $downvotes: 0,
        $score: typeof totd.score === 'number' ? totd.score : 0,
      })
    }
  }

  db.close()
  consola.success('Successfully migrated datacord.json to datacord.sqlite')
}

