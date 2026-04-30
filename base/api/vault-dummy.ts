import type { VaultApi } from "./vault"


export const useVaultDummy = async () => {
  const getBirthdays = () => Promise.resolve([[ 'Alice', 30 ] as [ name: string, age: number ]]) 

  return {
    getBirthdays
  } satisfies VaultApi
}
