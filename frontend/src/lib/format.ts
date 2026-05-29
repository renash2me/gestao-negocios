/**
 * Formata valor em reais: 1234.56 → "R$ 1.234,56"
 */
export function formatBRL(value: number, decimals = 2): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Formata número com decimais: 0.0345 → "0,0345"
 */
export function formatDecimal(value: number, decimals = 4): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Formata telefone para exibição: "11940404040" → "(11) 94040-4040"
 */
export function formatPhone(raw: string | null): string {
  if (!raw) return '—'
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return raw
}

/**
 * Remove formatação do telefone para salvar: "(11) 94040-4040" → "11940404040"
 */
export function cleanPhone(formatted: string): string {
  return formatted.replace(/\D/g, '')
}

/**
 * Aplica máscara de telefone enquanto digita
 */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

/**
 * Parseia input com vírgula para número: "1.234,56" → 1234.56
 */
export function parseComma(value: string): number {
  return Number(value.replace(/\./g, '').replace(',', '.'))
}
