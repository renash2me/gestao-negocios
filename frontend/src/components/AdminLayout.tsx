import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { SyncBadge } from './SyncBadge'

const NAV_ITEMS = [
  { to: '/admin/products',    label: 'Produtos' },
  { to: '/admin/ingredients', label: 'Insumos' },
  { to: '/admin/machines',    label: 'Maquininhas' },
  { to: '/admin/customers',   label: 'Clientes' },
  { to: '/admin/electricity', label: 'Conta de Luz' },
  { to: '/admin/users',       label: 'Usuários' },
  { to: '/pdv',               label: 'Voltar ao PDV' },
]

export function AdminLayout() {
  const { name, logout } = useAuth()

  return (
    <div style={styles.wrap}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <span style={styles.brandMark}>✿</span>
          <div>
            <div style={styles.brandName}>Flores &amp; Doces</div>
            <div style={styles.brandSub}>Administração</div>
          </div>
        </div>

        <nav style={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                ...styles.navLink,
                ...(isActive ? styles.navLinkActive : {}),
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <SyncBadge />
          <div style={styles.user}>
            <span style={styles.userName}>{name}</span>
            <button style={styles.logoutBtn} onClick={logout}>Sair</button>
          </div>
        </div>
      </aside>

      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: 'flex', minHeight: '100vh' },
  sidebar: {
    width: '240px',
    minWidth: '240px',
    background: 'var(--berry-dark)',
    color: 'var(--white)',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 0',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '0 20px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.12)',
    marginBottom: '16px',
  },
  brandMark: { fontSize: '28px' },
  brandName: { fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600 },
  brandSub: { fontSize: '11px', opacity: 0.7 },
  nav: { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, padding: '0 8px' },
  navLink: {
    display: 'block',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'rgba(255,255,255,0.75)',
    textDecoration: 'none',
    borderRadius: '8px',
  },
  navLinkActive: {
    background: 'rgba(255,255,255,0.15)',
    color: 'var(--white)',
  },
  sidebarFooter: {
    padding: '16px 20px 0',
    borderTop: '1px solid rgba(255,255,255,0.12)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  user: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  userName: { fontSize: '13px', opacity: 0.8 },
  logoutBtn: { fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 },
}
