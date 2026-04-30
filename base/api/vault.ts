

const baseUrl = 'http://localhost:3000/api'

function createFetchHook<T>(url: string, ttl: number) {
  let cache: T | null = null
  let lastFetch = 0

  async function fetchData() {
    const response = await fetch(baseUrl + url)
    const data = await response.json()
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
  const getBirthdays = createFetchHook<Array<[ name: string, age: number ]>>('/birthdays/05-21', 1000 * 60 * 60)

  return {
    getBirthdays
  }
}

export type VaultApi = Awaited<ReturnType<typeof useVaultApi>>
