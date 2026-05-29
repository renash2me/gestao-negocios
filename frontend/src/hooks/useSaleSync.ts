import { useState, useEffect, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, syncPendingSales } from '../lib/db'
import { api } from '../lib/api'
import { useOnlineStatus } from './useOnlineStatus'

export function useSaleSync() {
  const isOnline = useOnlineStatus()
  const [syncing, setSyncing] = useState(false)

  // Conta reativa de vendas pendentes
  const pendingCount = useLiveQuery(() => db.pendingSales.count(), [], 0)

  const sync = useCallback(async () => {
    if (syncing || !isOnline) return
    setSyncing(true)
    try {
      await syncPendingSales((payload) => api.post('/sales/', payload).then((r) => r.data))
    } finally {
      setSyncing(false)
    }
  }, [syncing, isOnline])

  // Sincroniza automaticamente quando volta a ficar online
  useEffect(() => {
    if (isOnline && pendingCount && pendingCount > 0) {
      sync()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, pendingCount])

  return { pendingCount: pendingCount ?? 0, syncing, sync, isOnline }
}
