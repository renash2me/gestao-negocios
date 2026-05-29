export interface Product {
  id: number
  name: string
  description: string | null
  sale_price: number
  prep_time_minutes: number
  is_active: boolean
}

export interface CardMachine {
  id: number
  name: string
  debit_fee_percent: number
  credit_fee_percent: number
  is_active: boolean
}

export interface Customer {
  id: number
  name: string
  phone: string | null
}

export type PaymentMethod = 'dinheiro' | 'pix' | 'debito' | 'credito'

export interface CartItem {
  product: Product
  quantity: number
}

export interface SalePayload {
  client_ref?: string
  customer_id: number | null
  payment_method: PaymentMethod
  card_machine_id: number | null
  items: { product_id: number; quantity: number }[]
  sold_at: string
}
