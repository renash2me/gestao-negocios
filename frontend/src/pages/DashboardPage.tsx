import { useState } from 'react'
import { SummaryCards } from '../components/bi/SummaryCards'
import { TopProductsChart } from '../components/bi/TopProductsChart'
import { TopCustomersTable } from '../components/bi/TopCustomersTable'
import { InactiveCustomers } from '../components/bi/InactiveCustomers'
import { SalesTimeline } from '../components/bi/SalesTimeline'
import { ProfitByProduct } from '../components/bi/ProfitByProduct'

const PERIOD_OPTIONS = [
  { label: '7 dias', value: 7 },
  { label: '30 dias', value: 30 },
  { label: '90 dias', value: 90 },
  { label: '365 dias', value: 365 },
]

const DASHBOARD_CSS = `
  .dash-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 20px;
  }
  @media (max-width: 768px) {
    .dash-grid-2 { grid-template-columns: 1fr; }
    .dash-wrap { padding: 16px 14px !important; }
    .dash-period-selector { width: 100%; }
    .dash-period-selector button { flex: 1; padding: 8px 10px !important; font-size: 12px !important; }
  }
`

export function DashboardPage() {
  const [days, setDays] = useState(30)

  return (
    <>
      <style>{DASHBOARD_CSS}</style>
      <div className="dash-wrap" style={styles.wrap}>
        <div style={styles.header}>
          <h1 style={styles.title}>Painel de Gestão</h1>
          <div className="dash-period-selector" style={styles.periodSelector}>
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p.value}
                style={{ ...styles.periodBtn, ...(days === p.value ? styles.periodBtnActive : {}) }}
                onClick={() => setDays(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <SummaryCards days={days} />

        <div style={styles.row}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Vendas por dia</h3>
            <SalesTimeline days={days} />
          </div>
        </div>

        <div className="dash-grid-2">
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Produtos mais vendidos</h3>
            <TopProductsChart days={days} />
          </div>
        </div>

        <div className="dash-grid-2">
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Lucratividade por produto</h3>
            <ProfitByProduct days={days} />
          </div>
        </div>

        <div className="dash-grid-2">
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Melhores clientes</h3>
            <TopCustomersTable days={days} />
          </div>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Clientes inativos</h3>
            <InactiveCustomers inactiveDays={days} />
          </div>
        </div>
      </div>
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { padding: '28px 32px', maxWidth: '1200px', width: '100%' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '24px',
    fontWeight: 600,
    color: 'var(--berry-dark)',
  },
  periodSelector: { display: 'flex', gap: '6px' },
  periodBtn: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--ink-soft)',
    background: 'var(--white)',
    border: '1.5px solid var(--cream-dark)',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  periodBtnActive: {
    background: 'var(--berry)',
    color: 'var(--white)',
    borderColor: 'var(--berry)',
  },
  row: { marginBottom: '20px' },
  card: {
    background: 'var(--white)',
    borderRadius: 'var(--radius)',
    padding: '20px',
    boxShadow: 'var(--shadow-sm)',
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--ink-soft)',
    marginBottom: '16px',
  },
}
