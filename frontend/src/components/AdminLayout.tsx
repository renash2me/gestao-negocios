import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { SyncBadge } from './SyncBadge'

const NAV_ITEMS = [
  { to: '/admin/dashboard',     label: '📊 Painel de Gestão' },
  { to: '/admin/recipes',       label: 'Receitas' },
  { to: '/admin/products',      label: 'Produtos' },
  { to: '/admin/ingredients',   label: 'Insumos' },
  { to: '/admin/machines',      label: 'Maquininhas' },
  { to: '/admin/customers',     label: 'Clientes' },
  { to: '/admin/electricity',   label: 'Conta de Luz' },
  { to: '/admin/users',         label: 'Usuários' },
  { to: '/admin/failed-sales',  label: 'Vendas com falha' },
  { to: '/pdv',                 label: 'Voltar ao PDV' },
]

export function AdminLayout() {
  const { name, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <style>{`
        .adm-wrap { min-height: 100vh; display: flex; }
        .adm-header {
          display: none; position: fixed; top: 0; left: 0; right: 0; height: 56px;
          background: var(--berry-dark); color: var(--white); align-items: center;
          justify-content: space-between; padding: 0 16px; z-index: 30;
        }
        .adm-sidebar {
          position: fixed; top: 0; left: 0; bottom: 0; width: 240px;
          background: var(--berry-dark); color: var(--white); display: flex;
          flex-direction: column; padding: 20px 0; z-index: 40;
          transition: transform 0.25s ease;
        }
        .adm-main { margin-left: 240px; flex: 1; min-height: 100vh; }
        .adm-overlay { display: none; }
        .adm-desktop-sync { display: block; }

        @media (max-width: 768px) {
          .adm-header { display: flex; }
          .adm-sidebar { transform: translateX(-100%); }
          .adm-sidebar.open { transform: translateX(0); }
          .adm-main { margin-left: 0; padding-top: 60px; }
          .adm-overlay.open { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 35; }
          .adm-desktop-sync { display: none; }
        }
      `}</style>

      <div className="adm-wrap">
        <header className="adm-header">
          <button onClick={() => setMenuOpen(!menuOpen)} style={s.hamburger}>
            <span style={s.hLine} /><span style={s.hLine} /><span style={s.hLine} />
          </button>
          <span style={s.mobileTitle}>Flores &amp; Doces</span>
          <SyncBadge />
        </header>

        <div className={`adm-overlay ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} />

        <aside className={`adm-sidebar ${menuOpen ? 'open' : ''}`}>
          <div style={s.brand}>
            <span style={{ fontSize: '28px' }}>✿</span>
            <div>
              <div style={s.brandName}>Flores &amp; Doces</div>
              <div style={{ fontSize: '11px', opacity: 0.7 }}>Administração</div>
            </div>
          </div>

          <nav style={s.nav}>
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                style={({ isActive }) => ({
                  ...s.navLink,
                  ...(isActive ? s.navLinkActive : {}),
                })}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div style={s.footer}>
            <div className="adm-desktop-sync"><SyncBadge /></div>
            <div style={s.user}>
              <span style={{ fontSize: '13px', opacity: 0.8 }}>{name}</span>
              <button style={s.logoutBtn} onClick={logout}>Sair</button>
            </div>
          </div>
        </aside>

        <main className="adm-main">
          <Outlet />
        </main>
      </div>
    </>
  )
}

const s: Record<string, React.CSSProperties> = {
  hamburger: {
    display: 'flex', flexDirection: 'column', gap: '5px',
    padding: '8px', background: 'none', border: 'none',
  },
  hLine: { display: 'block', width: '22px', height: '2px', background: 'var(--white)', borderRadius: '1px' },
  mobileTitle: { fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600 },
  brand: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '0 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.12)', marginBottom: '16px',
  },
  brandName: { fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600 },
  nav: { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, padding: '0 8px', overflowY: 'auto' },
  navLink: {
    display: 'block', padding: '12px 16px', fontSize: '14px', fontWeight: 500,
    color: 'rgba(255,255,255,0.75)', textDecoration: 'none', borderRadius: '8px',
  },
  navLinkActive: { background: 'rgba(255,255,255,0.15)', color: 'var(--white)' },
  footer: {
    padding: '16px 20px 0', borderTop: '1px solid rgba(255,255,255,0.12)',
    display: 'flex', flexDirection: 'column', gap: '12px',
  },
  user: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logoutBtn: { fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 },
}
