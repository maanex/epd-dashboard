import consola from "consola"


const baseUrl = 'http://100.74.226.120:3063'
// const baseUrl = 'http://localhost:3063/api'

function createFetchHook<T>(url: string, ttl: number) {
  let cache: T | null = null
  let lastFetch = 0

  async function fetchData() {
    const response = await fetch(baseUrl + url)
      .catch(err => {
        consola.error(`Error fetching ${url}:`, err)
        return null
      })
    const data = await response?.json().catch(() => null) ?? []
    cache = data
    lastFetch = Date.now()
    return data as T
  }

  return async function() {
    if (cache && Date.now() - lastFetch <= ttl)
      return cache!
    return fetchData()
  }
}

export const useVaultApi = async () => {
  const getBirthdays = createFetchHook<Array<[ name: string, age: number ]>>('/birthdays', 1000 * 60 * 60)
  const getTasks = createFetchHook<Array<{ name: string, due: string, category: string | null, folder: string }>>('/tasks', 1000 * 60)

  return {
    getBirthdays,
    getTasks
  }
}

export type VaultApi = Awaited<ReturnType<typeof useVaultApi>>
