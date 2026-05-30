import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { formatBRL, formatPhone } from '../lib/format'
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
  pdvLocation: string | null
  onConfirm: (payment: PaymentMethod, machineId: number | null, customerId: number | null) => void
  onClose: () => void
}

export function CheckoutModal({ cart, total, pdvLocation, onConfirm, onClose }: Props) {
  const [payment, setPayment] = useState<PaymentMethod | null>(null)
  const [machineId, setMachineId] = useState<number | null>(null)
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const { data: machines = [] } = useQuery<CardMachine[]>({
    queryKey: ['card-machines'],
    queryFn: () => api.get('/costs/card-machines').then((r) => r.data),
  })

  // Busca clientes do location do PDV + busca por nome
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers-checkout', pdvLocation],
    queryFn: () => {
      const params = new URLSearchParams()
      if (pdvLocation) params.set('location', pdvLocation)
      return api.get(`/customers/?${params}`).then((r) => r.data)
    },
  })

  const filtered = customerSearch.length > 0
    ? customers.filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
    : customers

  const needsMachine = payment === 'debito' || payment === 'credito'

  useEffect(() => {
    if (needsMachine && machines.length === 1) setMachineId(machines[0].id)
    if (!needsMachine) setMachineId(null)
  }, [needsMachine, machines])

  const canConfirm = payment && (!needsMachine || machineId)

  function selectCustomer(c: Customer) {
    setCustomerId(c.id)
    setCustomerSearch(c.name)
    setShowSuggestions(false)
  }

  function clearCustomer() {
    setCustomerId(null)
    setCustomerSearch('')
  }

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
          <span style={styles.totalValue}>{formatBRL(total)}</span>
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
          <label style={styles.sectionLabel}>
            Cliente {pdvLocation && <span style={{ fontWeight: 400, opacity: 0.7 }}>({pdvLocation})</span>}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              style={styles.searchInput}
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value)
                setCustomerId(null)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Digite para buscar ou deixe vazio..."
              autoComplete="off"
            />
            {customerId && (
              <button style={styles.clearBtn} onClick={clearCustomer}>✕</button>
            )}
            {showSuggestions && customerSearch.length > 0 && filtered.length > 0 && !customerId && (
              <div style={styles.suggestions}>
                {filtered.slice(0, 6).map((c) => (
                  <button key={c.id} style={styles.suggestionItem} onClick={() => selectCustomer(c)}>
                    <span style={{ fontWeight: 500 }}>{c.name}</span>
                    {c.phone && <span style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>{formatPhone(c.phone)}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!customerId && customerSearch.length === 0 && (
            <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginTop: '4px' }}>
              Sem cliente selecionado
            </div>
          )}
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
  searchInput: {
    width: '100%',
    padding: '14px 40px 14px 16px',
    fontSize: '15px',
    border: '2px solid var(--cream-dark)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--cream)',
    color: 'var(--ink)',
    outline: 'none',
  },
  clearBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '16px',
    color: 'var(--ink-soft)',
    padding: '4px',
  },
  suggestions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: 'var(--white)',
    border: '2px solid var(--cream-dark)',
    borderTop: 'none',
    borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
    maxHeight: '200px',
    overflowY: 'auto',
    zIndex: 10,
    boxShadow: 'var(--shadow-md)',
  },
  suggestionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    padding: '12px 16px',
    fontSize: '14px',
    color: 'var(--ink)',
    textAlign: 'left',
    borderBottom: '1px solid var(--cream)',
    background: 'none',
    border: 'none',
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    borderBottomColor: 'var(--cream)',
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
