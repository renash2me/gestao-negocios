import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { CartItem, CardMachine, Customer, PaymentMethod } from '../lib/types'

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  debito: 'Débito',
  credito: 'Crédito',
}

interface Props {
  cart: CartItem[]
  total: number
  onConfirm: (payment: PaymentMethod, machineId: number | null, customerId: number | null) => void
  onClose: () => void
}

export function CheckoutModal({ cart, total, onConfirm, onClose }: Props) {
  const [payment, setPayment] = useState<PaymentMethod | null>(null)
  const [machineId, setMachineId] = useState<number | null>(null)
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [confirming, setConfirming] = useState(false)

  const { data: machines = [] } = useQuery<CardMachine[]>({
    queryKey: ['card-machines'],
    queryFn: () => api.get('/costs/card-machines').then((r) => r.data),
  })

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers/').then((r) => r.data),
  })

  const needsMachine = payment === 'debito' || payment === 'credito'

  // Auto-seleciona maquininha se só existir uma
  useEffect(() => {
    if (needsMachine && machines.length === 1) setMachineId(machines[0].id)
    if (!needsMachine) setMachineId(null)
  }, [needsMachine, machines])

  const canConfirm = payment && (!needsMachine || machineId)

  function handleConfirm() {
    if (!canConfirm || confirming) return
    setConfirming(true)
    onConfirm(payment!, machineId, customerId)
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={styles.handle} />

        <div style={styles.totalBox}>
          <span style={styles.totalLabel}>Total da venda</span>
          <span style={styles.totalValue}>
            R$ {total.toFixed(2).replace('.', ',')}
          </span>
          <span style={styles.itemCount}>
            {cart.reduce((s, i) => s + i.quantity, 0)} itens
          </span>
        </div>

        <div style={styles.section}>
          <label style={styles.sectionLabel}>Forma de pagamento</label>
          <div style={styles.paymentGrid}>
            {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((p) => (
              <button
                key={p}
                style={{
                  ...styles.paymentBtn,
                  ...(payment === p ? styles.paymentBtnActive : {}),
                }}
                onClick={() => setPayment(p)}
              >
                {PAYMENT_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {needsMachine && (
          <div style={styles.section}>
            <label style={styles.sectionLabel}>Maquininha</label>
            <div style={styles.machineList}>
              {machines.map((m) => (
                <button
                  key={m.id}
                  style={{
                    ...styles.machineBtn,
                    ...(machineId === m.id ? styles.machineBtnActive : {}),
                  }}
                  onClick={() => setMachineId(m.id)}
                >
                  {m.name}
                </button>
              ))}
              {machines.length === 0 && (
                <span style={styles.empty}>Nenhuma maquininha cadastrada</span>
              )}
            </div>
          </div>
        )}

        <div style={styles.section}>
          <label style={styles.sectionLabel}>Cliente (opcional)</label>
          <select
            style={styles.select}
            value={customerId ?? ''}
            onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Venda sem cliente</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <button
          style={{ ...styles.confirmBtn, ...(canConfirm ? {} : styles.confirmBtnDisabled) }}
          onClick={handleConfirm}
          disabled={!canConfirm || confirming}
        >
          {confirming ? 'Registrando...' : 'Confirmar venda'}
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(46,34,40,0.5)',
    display: 'flex',
    alignItems: 'flex-end',
    zIndex: 100,
    backdropFilter: 'blur(2px)',
  },
  sheet: {
    width: '100%',
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
    padding: '12px 20px 28px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: 'var(--shadow-lg)',
  },
  handle: {
    width: '40px',
    height: '4px',
    background: 'var(--cream-dark)',
    borderRadius: '2px',
    margin: '0 auto 16px',
  },
  totalBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px',
    background: 'linear-gradient(135deg, var(--berry) 0%, var(--berry-light) 100%)',
    borderRadius: 'var(--radius)',
    marginBottom: '20px',
  },
  totalLabel: { color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: 500 },
  totalValue: {
    fontFamily: 'var(--font-display)',
    color: 'var(--white)',
    fontSize: '36px',
    fontWeight: 600,
    lineHeight: 1.2,
  },
  itemCount: { color: 'rgba(255,255,255,0.8)', fontSize: '12px' },
  section: { marginBottom: '18px' },
  sectionLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--ink-soft)',
    marginBottom: '8px',
  },
  paymentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  paymentBtn: {
    padding: '16px',
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--ink)',
    background: 'var(--cream)',
    border: '2px solid var(--cream-dark)',
    borderRadius: 'var(--radius-sm)',
  },
  paymentBtnActive: {
    background: 'var(--berry)',
    color: 'var(--white)',
    borderColor: 'var(--berry)',
  },
  machineList: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  machineBtn: {
    padding: '12px 18px',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--ink)',
    background: 'var(--cream)',
    border: '2px solid var(--cream-dark)',
    borderRadius: 'var(--radius-sm)',
  },
  machineBtnActive: {
    background: 'var(--caramel)',
    color: 'var(--white)',
    borderColor: 'var(--caramel)',
  },
  select: {
    width: '100%',
    padding: '14px 16px',
    fontSize: '15px',
    border: '2px solid var(--cream-dark)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--cream)',
    color: 'var(--ink)',
  },
  empty: { color: 'var(--ink-soft)', fontSize: '14px', fontStyle: 'italic' },
  confirmBtn: {
    width: '100%',
    padding: '18px',
    fontSize: '17px',
    fontWeight: 700,
    color: 'var(--white)',
    background: 'var(--success)',
    borderRadius: 'var(--radius-sm)',
    marginTop: '4px',
    boxShadow: 'var(--shadow-md)',
  },
  confirmBtnDisabled: { opacity: 0.4, boxShadow: 'none' },
}
