import Dexie, { type Table } from 'dexie'

export interface PendingSale {
  id?: number
  clientRef: string       // UUID gerado localmente
  payload: object         // corpo exato que vai pro POST /api/v1/sales
  createdAt: Date
  retries: number
}

class GestaoDatabase extends Dexie {
  pendingSales!: Table<PendingSale>

  constructor() {
    super('gestao-negocios-db')
    this.version(1).stores({
      pendingSales: '++id, clientRef, createdAt',
    })
  }
}

export const db = new GestaoDatabase()

// ---------------------------------------------------------------------------
// Helpers para o background sync
// ---------------------------------------------------------------------------

export async function queueSale(payload: object): Promise<string> {
  const clientRef = crypto.randomUUID()
  await db.pendingSales.add({
    clientRef,
    payload: { ...payload, client_ref: clientRef },
    createdAt: new Date(),
    retries: 0,
  })
  return clientRef
}

export async function syncPendingSales(
  apiPost: (payload: object) => Promise<unknown>
): Promise<{ synced: number; failed: number }> {
  const pending = await db.pendingSales.toArray()
  let synced = 0
  let failed = 0

  for (const sale of pending) {
    try {
      await apiPost(sale.payload)
      await db.pendingSales.delete(sale.id!)
      synced++
    } catch {
      await db.pendingSales.update(sale.id!, { retries: sale.retries + 1 })
      failed++
    }
  }

  return { synced, failed }
}
