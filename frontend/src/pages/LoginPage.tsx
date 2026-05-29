import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/pdv')
    } catch {
      setError('Email ou senha incorretos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.decorTop} />
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.logoMark}>✿</span>
        </div>
        <h1 style={styles.title}>Flores &amp; Doces</h1>
        <p style={styles.subtitle}>Entre para registrar suas vendas</p>

        <div style={styles.field}>
          <label style={styles.label}>Email</label>
          <input
            style={styles.input}
            type="email"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Senha</label>
          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="••••••••"
          />
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <button style={styles.button} onClick={handleSubmit} disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(160deg, var(--cream) 0%, var(--cream-dark) 100%)',
  },
  decorTop: {
    position: 'absolute',
    top: '-120px',
    right: '-80px',
    width: '320px',
    height: '320px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(168,85,116,0.18) 0%, transparent 70%)',
  },
  card: {
    width: '100%',
    maxWidth: '380px',
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: '40px 28px',
    boxShadow: 'var(--shadow-lg)',
    position: 'relative',
    zIndex: 1,
  },
  logo: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--berry) 0%, var(--berry-light) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    boxShadow: 'var(--shadow-md)',
  },
  logoMark: { fontSize: '30px', color: 'var(--white)' },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '28px',
    fontWeight: 600,
    textAlign: 'center',
    color: 'var(--berry-dark)',
    marginBottom: '6px',
  },
  subtitle: {
    textAlign: 'center',
    color: 'var(--ink-soft)',
    fontSize: '14px',
    marginBottom: '28px',
  },
  field: { marginBottom: '16px' },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--ink-soft)',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    fontSize: '16px',
    border: '2px solid var(--cream-dark)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--cream)',
    color: 'var(--ink)',
    outline: 'none',
  },
  error: {
    background: '#fbe9e7',
    color: 'var(--danger)',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '14px',
    marginBottom: '16px',
    textAlign: 'center',
  },
  button: {
    width: '100%',
    padding: '16px',
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--white)',
    background: 'linear-gradient(135deg, var(--berry) 0%, var(--berry-light) 100%)',
    borderRadius: 'var(--radius-sm)',
    marginTop: '8px',
    boxShadow: 'var(--shadow-md)',
  },
}
