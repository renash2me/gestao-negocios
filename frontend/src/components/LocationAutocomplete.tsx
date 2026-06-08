import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { inputStyle } from './Modal'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  style?: React.CSSProperties
}

/**
 * Input de texto livre com autocomplete dos locais/prédios já cadastrados.
 * Usa <datalist> nativo: o usuário pode escolher um local existente ou
 * digitar um novo. Compartilha a queryKey ['locations'] com o PDV, então
 * o cache é reaproveitado.
 */
export function LocationAutocomplete({ value, onChange, placeholder, style }: Props) {
  const { data: locations = [] } = useQuery<string[]>({
    queryKey: ['locations'],
    queryFn: () => api.get('/customers/locations').then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  })

  return (
    <>
      <input
        list="known-locations"
        style={style || inputStyle}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Ex: Ed. Villa Lobos'}
        autoComplete="off"
      />
      <datalist id="known-locations">
        {locations.map((loc) => (
          <option key={loc} value={loc} />
        ))}
      </datalist>
    </>
  )
}
