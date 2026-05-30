import { inputStyle } from '../components/Modal'

interface Props {
  value: string
  onChange: (raw: string) => void
  placeholder?: string
  style?: React.CSSProperties
  decimals?: number // casas decimais permitidas (padrão: livre)
}

/**
 * Input numérico que aceita vírgula como separador decimal.
 * Exibe o valor com vírgula, mas o onChange retorna o valor com ponto
 * pronto para converter com Number().
 *
 * Uso:
 *   <NumericInput value={price} onChange={setPrice} placeholder="4,50" />
 *   // price será "4.50" internamente, exibido como "4,50"
 */
export function NumericInput({ value, onChange, placeholder, style, decimals }: Props) {
  // Converte valor interno (com ponto) para exibição (com vírgula)
  const display = value.replace('.', ',')

  function handleChange(input: string) {
    // Permite: dígitos, vírgula e ponto como decimal
    let cleaned = input.replace(/[^0-9.,]/g, '')

    // Troca vírgula por ponto para armazenamento interno
    // Mas permite apenas um separador decimal
    const parts = cleaned.replace(',', '.').split('.')
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('')
    } else {
      cleaned = parts.join('.')
    }

    // Limita casas decimais se especificado
    if (decimals !== undefined && cleaned.includes('.')) {
      const [int, dec] = cleaned.split('.')
      cleaned = int + '.' + dec.slice(0, decimals)
    }

    onChange(cleaned)
  }

  return (
    <input
      style={style || inputStyle}
      value={display}
      onChange={(e) => handleChange(e.target.value)}
      placeholder={placeholder}
      inputMode="decimal"
      autoComplete="off"
    />
  )
}
