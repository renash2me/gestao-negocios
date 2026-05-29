import { useSaleSync } from '../hooks/useSaleSync'

export function SyncBadge() {
  const { isOnline, pendingCount, syncing } = useSaleSync()

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
    <div style={{ ...styles.badge, color, background: bg }}>
      <span style={{ ...styles.dot, background: color }} />
      {label}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: 600,
    padding: '5px 12px',
    borderRadius: '999px',
  },
  dot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
  },
}
