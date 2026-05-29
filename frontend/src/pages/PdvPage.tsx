import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { formatBRL } from '../lib/format'
import { useAuth } from '../store/auth'
import { queueSale } from '../lib/db'
import { useSaleSync } from '../hooks/useSaleSync'
import { SyncBadge } from '../components/SyncBadge'
import { CheckoutModal } from '../components/CheckoutModal'
import type { Product, CartItem, PaymentMethod } from '../lib/types'

export function PdvPage() {
  const { name, role, logout } = useAuth()
  const navigate = useNavigate()
  const { sync } = useSaleSync()
  const [cart, setCart] = useState<CartItem[]>([])
  const [checkout, setCheckout] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/products/').then((r) => r.data),
  })

  const total = cart.reduce((s, i) => s + i.product.sale_price * i.quantity, 0)
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0)

  function addToCart(product: Product) {
    setCart((prev) => {
      const found = prev.find((i) => i.product.id === product.id)
      if (found) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  function removeOne(productId: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    )
  }

  function qtyOf(productId: number) {
    return cart.find((i) => i.product.id === productId)?.quantity ?? 0
  }

  async function handleConfirm(
    payment: PaymentMethod,
    machineId: number | null,
    customerId: number | null
  ) {
    const payload = {
      customer_id: customerId,
      payment_method: payment,
      card_machine_id: machineId,
      items: cart.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
      sold_at: new Date().toISOString(),
    }

    // Sempre grava na fila local primeiro — garante que a venda nunca se perde
    await queueSale(payload)
    sync() // tenta enviar imediatamente se estiver online

    setCart([])
    setCheckout(false)
    setToast('Venda registrada! ✓')
    setTimeout(() => setToast(null), 2500)
  }

  return (
    <div style={styles.wrap}>
      <header style={styles.header}>
        <div>
          <div style={styles.greeting}>Olá, {name?.split(' ')[0]}</div>
          <div style={styles.brand}>Flores &amp; Doces</div>
        </div>
        <div style={styles.headerRight}>
          <SyncBadge />
          {role === 'admin' && (
            <button style={styles.adminBtn} onClick={() => navigate('/admin')}>Admin</button>
          )}
          <button style={styles.logoutBtn} onClick={logout}>Sair</button>
        </div>
      </header>

      {isLoading ? (
        <div style={styles.loading}>Carregando produtos...</div>
      ) : (
        <div style={styles.grid}>
          {products.map((p) => {
            const q = qtyOf(p.id)
            return (
              <button
                key={p.id}
                style={{ ...styles.card, ...(q > 0 ? styles.cardActive : {}) }}
                onClick={() => addToCart(p)}
              >
                {q > 0 && <span style={styles.qtyBadge}>{q}</span>}
                <span style={styles.productName}>{p.name}</span>
                <span style={styles.productPrice}>
                  {formatBRL(p.sale_price)}
                </span>
                {q > 0 && (
                  <span
                    style={styles.minus}
                    onClick={(e) => { e.stopPropagation(); removeOne(p.id) }}
                  >
                    −
                  </span>
                )}
              </button>
            )
          })}
          {products.length === 0 && (
            <div style={styles.empty}>Nenhum produto cadastrado ainda.</div>
          )}
        </div>
      )}

      {itemCount > 0 && (
        <div style={styles.cartBar} onClick={() => setCheckout(true)}>
          <div style={styles.cartInfo}>
            <span style={styles.cartCount}>{itemCount}</span>
            <span>Ver venda</span>
          </div>
          <span style={styles.cartTotal}>
            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {checkout && (
        <CheckoutModal
          cart={cart}
          total={total}
          onConfirm={handleConfirm}
          onClose={() => setCheckout(false)}
        />
      )}

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { minHeight: '100%', paddingBottom: '90px' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 18px 16px',
    background: 'var(--white)',
    borderBottom: '1px solid var(--cream-dark)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  greeting: { fontSize: '13px', color: 'var(--ink-soft)' },
  brand: {
    fontFamily: 'var(--font-display)',
    fontSize: '20px',
    fontWeight: 600,
    color: 'var(--berry-dark)',
  },
  headerRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' },
  logoutBtn: { fontSize: '13px', color: 'var(--ink-soft)', fontWeight: 500 },
  adminBtn: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--berry)',
    padding: '5px 12px',
    background: 'rgba(125,60,82,0.1)',
    borderRadius: '6px',
  },
  loading: { textAlign: 'center', padding: '60px', color: 'var(--ink-soft)' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '12px',
    padding: '16px',
  },
  card: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '6px',
    padding: '18px 16px',
    background: 'var(--white)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
    border: '2px solid transparent',
    minHeight: '96px',
    textAlign: 'left',
    transition: 'transform 0.1s',
  },
  cardActive: { borderColor: 'var(--berry)', boxShadow: 'var(--shadow-md)' },
  qtyBadge: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    minWidth: '26px',
    height: '26px',
    background: 'var(--berry)',
    color: 'var(--white)',
    borderRadius: '13px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 700,
    padding: '0 7px',
  },
  productName: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--ink)',
    lineHeight: 1.25,
  },
  productPrice: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--berry)',
    fontFamily: 'var(--font-display)',
  },
  minus: {
    position: 'absolute',
    bottom: '12px',
    right: '12px',
    width: '32px',
    height: '32px',
    background: 'var(--cream-dark)',
    color: 'var(--ink)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    fontWeight: 700,
  },
  empty: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '40px',
    color: 'var(--ink-soft)',
  },
  cartBar: {
    position: 'fixed',
    bottom: '16px',
    left: '16px',
    right: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 22px',
    background: 'linear-gradient(135deg, var(--berry) 0%, var(--berry-light) 100%)',
    color: 'var(--white)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 50,
  },
  cartInfo: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px', fontWeight: 600 },
  cartCount: {
    minWidth: '28px',
    height: '28px',
    background: 'rgba(255,255,255,0.25)',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
    fontWeight: 700,
  },
  cartTotal: { fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-display)' },
  toast: {
    position: 'fixed',
    bottom: '90px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'var(--success)',
    color: 'var(--white)',
    padding: '14px 28px',
    borderRadius: '999px',
    fontSize: '15px',
    fontWeight: 600,
    boxShadow: 'var(--shadow-lg)',
    zIndex: 200,
  },
}
