import type { ReactNode } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
}

export function Modal({ title, onClose, children }: Props) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>{title}</h2>
          <button style={styles.close} onClick={onClose}>✕</button>
        </div>
        <div style={styles.body}>{children}</div>
      </div>
    </div>
  )
}

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  )
}

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  fontSize: '15px',
  border: '2px solid var(--cream-dark)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--cream)',
  color: 'var(--ink)',
  outline: 'none',
}

export const btnPrimary: React.CSSProperties = {
  width: '100%',
  padding: '14px',
  fontSize: '15px',
  fontWeight: 600,
  color: 'var(--white)',
  background: 'var(--berry)',
  borderRadius: 'var(--radius-sm)',
  border: 'none',
  cursor: 'pointer',
  marginTop: '8px',
}

export const btnDanger: React.CSSProperties = {
  ...btnPrimary,
  background: 'var(--danger)',
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(46,34,40,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    backdropFilter: 'blur(2px)',
    padding: '20px',
  },
  modal: {
    width: '100%',
    maxWidth: '480px',
    maxHeight: '90vh',
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 20px',
    borderBottom: '1px solid var(--cream-dark)',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--berry-dark)',
    margin: 0,
  },
  close: { fontSize: '18px', color: 'var(--ink-soft)', padding: '4px' },
  body: { padding: '20px', overflowY: 'auto' },
  field: { marginBottom: '14px' },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--ink-soft)',
    marginBottom: '6px',
  },
}
