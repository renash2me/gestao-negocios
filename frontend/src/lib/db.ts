import Dexie, { type Table } from 'dexie'

export interface PendingSale {
  id?: number
  clientRef: string
  payload: object
  createdAt: Date
  retries: number
}

export interface FailedSale {
  id?: number
  clientRef: string
  payload: object
  createdAt: Date
  failedAt: Date
  errorStatus: number
  errorMessage: string
}

class GestaoDatabase extends Dexie {
  pendingSales!: Table<PendingSale>
  failedSales!: Table<FailedSale>

  constructor() {
    super('gestao-negocios-db')
    this.version(2).stores({
      pendingSales: '++id, clientRef, createdAt',
      failedSales: '++id, clientRef, failedAt',
    })
  }
}

export const db = new GestaoDatabase()

// ---------------------------------------------------------------------------
// Helpers
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

/**
 * Erros terminais (4xx) vão para a fila de falhas permanentes.
 * Erros retentáveis (5xx, network, timeout) ficam na fila pendente.
 */
function isTerminalError(err: unknown): { terminal: boolean; status: number; message: string } {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { status?: number; data?: { detail?: string } } }).response
    if (res?.status && res.status >= 400 && res.status < 500) {
      return {
        terminal: true,
        status: res.status,
        message: res.data?.detail || `Erro ${res.status}`,
      }
    }
    return {
      terminal: false,
      status: res?.status || 0,
      message: res?.data?.detail || 'Erro do servidor',
    }
  }
  // Network error, timeout, etc — retentável
  return { terminal: false, status: 0, message: 'Erro de conexão' }
}

const MAX_RETRIES = 10

export async function syncPendingSales(
  apiPost: (payload: object) => Promise<unknown>
): Promise<{ synced: number; failed: number; terminal: number }> {
  const pending = await db.pendingSales.toArray()
  let synced = 0
  let failed = 0
  let terminal = 0

  for (const sale of pending) {
    try {
      await apiPost(sale.payload)
      await db.pendingSales.delete(sale.id!)
      synced++
    } catch (err) {
      const result = isTerminalError(err)

      if (result.terminal || sale.retries >= MAX_RETRIES) {
        // Move para fila de falhas permanentes
        await db.failedSales.add({
          clientRef: sale.clientRef,
          payload: sale.payload,
          createdAt: sale.createdAt,
          failedAt: new Date(),
          errorStatus: result.status,
          errorMessage: result.terminal
            ? result.message
            : `Excedeu ${MAX_RETRIES} tentativas: ${result.message}`,
        })
        await db.pendingSales.delete(sale.id!)
        terminal++
      } else {
        await db.pendingSales.update(sale.id!, { retries: sale.retries + 1 })
        failed++
      }
    }
  }

  return { synced, failed, terminal }
}

export async function getFailedSales(): Promise<FailedSale[]> {
  return db.failedSales.orderBy('failedAt').reverse().toArray()
}

export async function clearFailedSale(id: number): Promise<void> {
  await db.failedSales.delete(id)
}

export async function retryFailedSale(id: number): Promise<void> {
  const failed = await db.failedSales.get(id)
  if (!failed) return
  // Move de volta para a fila pendente
  await db.pendingSales.add({
    clientRef: failed.clientRef,
    payload: failed.payload,
    createdAt: failed.createdAt,
    retries: 0,
  })
  await db.failedSales.delete(id)
}
