import {
  DEFAULT_MONEY_RULES,
  type MoneyRules,
  type Quote,
  type QuoteCalculationLine,
  type QuoteCalculationResult,
  type QuotePaymentMilestone,
  type SortOption,
} from './types'

export function roundMoney(amount: number, fractionDigits = 2): number {
  if (!Number.isFinite(amount)) return 0
  const sign = amount < 0 ? -1 : 1
  const abs = Math.abs(amount)
  const rounded = Number(`${Math.round(Number(`${abs}e${fractionDigits}`))}e-${fractionDigits}`)
  const result = sign * (Number.isFinite(rounded) ? rounded : 0)
  return Object.is(result, -0) ? 0 : result
}

export function resolveMoneyRules(
  quote?: Pick<Quote, 'moneyRules' | 'templateSnapshot'>,
  override?: Partial<MoneyRules>,
): MoneyRules {
  const base = quote?.templateSnapshot?.moneyRules ?? DEFAULT_MONEY_RULES
  const quoteRules = quote?.moneyRules
  const rawTaxRate = override?.taxRate ?? quoteRules?.taxRate ?? base.taxRate
  const rawDiscountAmount =
    override?.discountAmount ?? quoteRules?.discountAmount ?? base.discountAmount
  const rawDiscountPercent =
    override?.discountPercent ?? quoteRules?.discountPercent ?? base.discountPercent ?? 0
  const discountType =
    override?.discountType ?? quoteRules?.discountType ?? base.discountType ?? 'amount'
  return {
    currency: 'SAR',
    fractionDigits: 2,
    taxRate: Number.isFinite(rawTaxRate) ? Math.max(0, rawTaxRate) : 0,
    discountAmount: Number.isFinite(rawDiscountAmount) ? Math.max(0, rawDiscountAmount) : 0,
    discountPercent: Number.isFinite(rawDiscountPercent)
      ? Math.min(100, Math.max(0, rawDiscountPercent))
      : 0,
    discountType,
  }
}

export const calculateQuote = (
  quote: Pick<Quote, 'items' | 'moneyRules' | 'templateSnapshot'>,
  rulesOverride?: Partial<MoneyRules>,
): QuoteCalculationResult => {
  const rules = resolveMoneyRules(quote, rulesOverride)
  const digits = rules.fractionDigits

  const lines: QuoteCalculationLine[] = (quote.items || []).map((item) => {
    const quantity = Number.isFinite(item.quantity) ? Math.max(0, item.quantity) : 0
    const unitPrice = Number.isFinite(item.unitPrice) ? Math.max(0, item.unitPrice) : 0
    const lineTotal = roundMoney(quantity * unitPrice, digits)
    return { id: item.id, quantity, unitPrice, lineTotal }
  })

  const rawSubtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0)
  const subtotal = roundMoney(rawSubtotal, digits)

  let calculatedDiscount = 0
  if (rules.discountType === 'percent' && rules.discountPercent && rules.discountPercent > 0) {
    calculatedDiscount = roundMoney((subtotal * rules.discountPercent) / 100, digits)
  } else {
    calculatedDiscount = roundMoney(Math.max(0, rules.discountAmount), digits)
  }

  const discount = roundMoney(Math.min(subtotal, calculatedDiscount), digits)
  const taxableAmount = roundMoney(Math.max(0, subtotal - discount), digits)
  const tax = roundMoney((taxableAmount * rules.taxRate) / 100, digits)
  const total = roundMoney(taxableAmount + tax, digits)

  return {
    currency: rules.currency,
    fractionDigits: digits,
    lines,
    subtotal,
    discount,
    taxableAmount,
    taxRate: rules.taxRate,
    tax,
    total,
  }
}

export function balancePaymentMilestones(
  total: number,
  milestones: QuotePaymentMilestone[],
): QuotePaymentMilestone[] {
  const count = milestones.length
  if (count === 0) return []
  let allocatedTotal = 0
  return milestones.map((m, idx) => {
    if (idx === count - 1) {
      const amount = roundMoney(Math.max(0, total - allocatedTotal), 2)
      return { ...m, amount }
    }
    const amount = roundMoney((total * m.percentage) / 100, 2)
    allocatedTotal = roundMoney(allocatedTotal + amount, 2)
    return { ...m, amount }
  })
}

export const quoteTotal = (quote: Quote): number => calculateQuote(quote).total

export function sortQuotes(quotes: Quote[], sortOption: SortOption): Quote[] {
  return [...quotes].sort((a, b) => {
    switch (sortOption) {
      case 'updated-desc':
        return b.updatedAt.localeCompare(a.updatedAt) || b.number.localeCompare(a.number)
      case 'updated-asc':
        return a.updatedAt.localeCompare(b.updatedAt) || a.number.localeCompare(b.number)
      case 'title-asc':
        return a.title.localeCompare(b.title, 'ar')
      case 'client-asc':
        return a.client.localeCompare(b.client, 'ar')
      case 'total-desc':
        return quoteTotal(b) - quoteTotal(a)
      case 'total-asc':
        return quoteTotal(a) - quoteTotal(b)
      default:
        return 0
    }
  })
}

export const formatQuoteCount = (count: number): string => {
  if (count === 0) return 'لا توجد عروض'
  if (count === 1) return 'عرض واحد'
  if (count === 2) return 'عرضان'
  if (count >= 3 && count <= 10) return `${count} عروض`
  return `${count} عرضًا`
}

export const formatMoney = (amount: number): string =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 2,
  }).format(roundMoney(amount, 2))

export const makeId = (): string => crypto.randomUUID()

