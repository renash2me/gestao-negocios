import { useSaleSync } from '../hooks/useSaleSync'

export function SyncBadge() {
  const { isOnline, pendingCount, failedCount, syncing } = useSaleSync()

  let label = 'Online'
  let color = 'var(--success)'
  let bg = 'var(--success-light)'

  if (!isOnline) {
    label = 'Offline'
    color = 'var(--warning)'
    bg = 'var(--warning-light)'
  }
  if (pendingCount > 0) {
    label = syncing
      ? `Enviando ${pendingCount}...`
      : `${pendingCount} na fila`
    color = 'var(--warning)'
    bg = 'var(--warning-light)'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
      <div style={{ ...styles.badge, color, background: bg }}>
        <span style={{ ...styles.dot, background: color }} />
        {label}
      </div>
      {failedCount > 0 && (
        <div style={{ ...styles.badge, color: 'var(--danger)', background: '#fbe9e7' }}>
          {failedCount} com erro
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: '999px',
  },
  dot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
  },
}
