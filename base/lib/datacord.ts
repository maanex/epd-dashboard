import * as fs from 'fs/promises'
import * as path from 'path'
import { Database } from 'bun:sqlite'
import consola from 'consola'
import { migrateDatacordIfNeeded } from './datacord-migrate'
import type { QuoteContent } from '../ui/astro/quote'

const CREDENTIALS_DIR = path.join(import.meta.dirname, '..', '..', 'credentials')
const SQLITE_PATH = path.join(CREDENTIALS_DIR, 'datacord.sqlite')
export const CACHE_DIR = path.join(CREDENTIALS_DIR, 'cache')
export const ARCHIVE_DIR = path.join(CREDENTIALS_DIR, 'archive')

export type DatacordCandidate = {
  id: string
  author: string
  authorId: string
  text: string | null
  fullscreen: boolean
}

export type DatacordWinner = {
  id: string
  author: string
  authorId: string
  text: string | null
  fullscreen: boolean
  upvotes: number
  downvotes: number
  score: number
}

type CandidateRow = {
  id: string
  author: string
  author_id: string
  text: string | null
  fullscreen: number
}

type WinnerRow = {
  id: string
  author: string
  author_id: string
  text: string | null
  fullscreen: number
  upvotes: number
  downvotes: number
  score: number
}

export function formatDateId(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

let dbInstance: Database | null = null

async function getDb(): Promise<Database> {
  if (dbInstance)
    return dbInstance

  await migrateDatacordIfNeeded()

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

  dbInstance = db
  return db
}

export async function useDatacord() {
  const db = await getDb()

  function addCandidate(candidate: DatacordCandidate) {
    db.prepare(`
      INSERT OR REPLACE INTO candidates (id, author, author_id, text, fullscreen)
      VALUES ($id, $author, $authorId, $text, $fullscreen)
    `).run({
      $id: candidate.id,
      $author: candidate.author,
      $authorId: candidate.authorId,
      $text: candidate.text,
      $fullscreen: candidate.fullscreen ? 1 : 0,
    })
  }

  function getCandidates(): DatacordCandidate[] {
    const rows = db.query<CandidateRow, []>(`
      SELECT id, author, author_id, text, fullscreen
      FROM candidates
    `).all()

    return rows.map(r => ({
      id: r.id,
      author: r.author,
      authorId: r.author_id,
      text: r.text,
      fullscreen: Boolean(r.fullscreen),
    }))
  }

  function clearCandidates() {
    db.run(`DELETE FROM candidates`)
  }

  function getUserWinsScore(authorId: string): number {
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const cutoffId = formatDateId(cutoffDate)

    const rows = db.query<{ author_id: string, wins: number }, [string]>(`
      SELECT author_id, COUNT(*) as wins
      FROM winners
      WHERE id >= ?
      GROUP BY author_id
    `).all(cutoffId)

    const userWins: Record<string, number> = {}
    for (const row of rows) {
      userWins[row.author_id] = row.wins
    }

    const maxUserWins = Math.max(0, ...Object.values(userWins))
    return 1 - (userWins[authorId] ?? 0) / (maxUserWins + 1)
  }

  async function recordWinner(
    candidate: DatacordCandidate,
    stats: { upvotes: number, downvotes: number, score: number }
  ): Promise<DatacordWinner> {
    const dateId = formatDateId()

    if (candidate.text === null) {
      await fs.mkdir(ARCHIVE_DIR, { recursive: true })
      const srcPath = path.join(CACHE_DIR, `${candidate.id}.png`)
      const dstPath = path.join(ARCHIVE_DIR, `${dateId}.png`)
      await fs.copyFile(srcPath, dstPath).catch(consola.error)
    }

    db.prepare(`
      INSERT OR REPLACE INTO winners (id, author, author_id, text, fullscreen, upvotes, downvotes, score)
      VALUES ($id, $author, $authorId, $text, $fullscreen, $upvotes, $downvotes, $score)
    `).run({
      $id: dateId,
      $author: candidate.author,
      $authorId: candidate.authorId,
      $text: candidate.text,
      $fullscreen: candidate.fullscreen ? 1 : 0,
      $upvotes: stats.upvotes,
      $downvotes: stats.downvotes,
      $score: stats.score,
    })

    return {
      id: dateId,
      author: candidate.author,
      authorId: candidate.authorId,
      text: candidate.text,
      fullscreen: candidate.fullscreen,
      upvotes: stats.upvotes,
      downvotes: stats.downvotes,
      score: stats.score,
    }
  }

  function getCurrentTotd(): QuoteContent | null {
    const latest = db.query<WinnerRow, []>(`
      SELECT id, author, author_id, text, fullscreen, upvotes, downvotes, score
      FROM winners
      ORDER BY id DESC
      LIMIT 1
    `).get()

    if (!latest)
      return null

    // Day rollover is at 03:30 AM when badaboom runs
    const activeDate = new Date(Date.now() - (3 * 60 + 30) * 60 * 1000)
    const minValidId = formatDateId(activeDate)
    if (latest.id < minValidId)
      return null

    return {
      author: latest.author,
      text: latest.text ?? undefined,
      image: latest.text === null ? path.join(ARCHIVE_DIR, `${latest.id}.png`) : undefined,
      fullscreen: Boolean(latest.fullscreen),
    }
  }

  return {
    addCandidate,
    getCandidates,
    clearCandidates,
    getUserWinsScore,
    recordWinner,
    getCurrentTotd,
  }
}

export type Datacord = Awaited<ReturnType<typeof useDatacord>>

