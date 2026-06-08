import type React from 'react'

/**
 * Classe CSS responsiva para o container das páginas de admin.
 * Injetada uma vez via <PageStyles/>. Usar className="adm-page" em vez
 * do antigo style={page.wrap} para que o padding reduza no mobile.
 */
export const PAGE_CSS = `
  .adm-page {
    padding: 28px 32px;
    max-width: 960px;
    width: 100%;
  }
  .adm-page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }
  @media (max-width: 768px) {
    .adm-page { padding: 16px 14px; }
    .adm-page-header { margin-bottom: 16px; }
  }
`

export const page: Record<string, React.CSSProperties> = {
  wrap: { padding: '28px 32px', maxWidth: '960px', width: '100%' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    gap: '12px',
    flexWrap: 'wrap',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '24px',
    fontWeight: 600,
    color: 'var(--berry-dark)',
  },
  addBtn: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--white)',
    background: 'var(--berry)',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    cursor: 'pointer',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: 'var(--white)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-sm)',
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--ink-soft)',
    background: 'var(--cream)',
    borderBottom: '1px solid var(--cream-dark)',
  },
  td: {
    padding: '14px 16px',
    fontSize: '14px',
    color: 'var(--ink)',
    borderBottom: '1px solid var(--cream)',
  },
  actionBtn: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--berry)',
    marginRight: '12px',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
  },
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    fontSize: '12px',
    fontWeight: 600,
    borderRadius: '999px',
  },
  badgeActive: { background: 'var(--success-light)', color: 'var(--success)' },
  badgeInactive: { background: '#fbe9e7', color: 'var(--danger)' },
  empty: { textAlign: 'center', padding: '40px', color: 'var(--ink-soft)', fontSize: '14px' },
  loading: { textAlign: 'center', padding: '40px', color: 'var(--ink-soft)' },
}
