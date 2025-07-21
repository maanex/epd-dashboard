

type Data = {
  fog: boolean
  a: boolean
  b: boolean
  c: boolean
}

export const useHomeioApi = async () => {
  const fetchApi = async () => {
    const response = await fetch(`http://192.168.178.51:3046/epd-data`)
    const data = await response.json()
    return data as Data
  }

  let data = await fetchApi()
  let dataTime = Date.now()

  async function refresh() {
    data = await fetchApi()
    dataTime = Date.now()
  }

  async function assertRecentData() {
    if (Date.now() - dataTime > 1000 * 60) // 1 minute
      await refresh()
  }

  //

  return {
    getData: () => data,
    refresh,
    assertRecentData
  }
}

export type HomeioApi = Awaited<ReturnType<typeof useHomeioApi>>
