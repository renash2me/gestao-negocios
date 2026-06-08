import type { ReactNode } from 'react'

/**
 * Envolve uma <table> larga num container que rola horizontalmente
 * dentro de si mesmo, em vez de empurrar a página inteira.
 * Resolve o scroll horizontal da viewport no mobile.
 */
export function TableScroll({ children }: { children: ReactNode }) {
  return <div className="table-scroll">{children}</div>
}
