export type QuoteStatus = 'مسودة' | 'جاهز' | 'مرسل' | 'مقبول' | 'مؤرشف'

export const QUOTE_STATUSES: readonly QuoteStatus[] = ['مسودة', 'جاهز', 'مرسل', 'مقبول', 'مؤرشف']

export interface MoneyRules {
  currency: 'SAR'
  fractionDigits: 2
  taxRate: number
  discountAmount: number
  discountPercent?: number
  discountType?: 'amount' | 'percent'
}

export interface TemplateSnapshot {
  id: string
  name: string
  version: number
  accent?: string
  moneyRules?: MoneyRules
}

export type MarginPreset = 'normal' | 'compact' | 'spacious'

export interface QuotePageSettings {
  marginPreset: MarginPreset
  repeatTableHeader: boolean
  breakBeforeMilestones?: boolean
  breakBeforeTerms?: boolean
  breakBeforeSignatures?: boolean
}

export interface QuoteItem {
  id: string
  title: string
  description?: string
  quantity: number
  unitPrice: number
  pageBreakBefore?: boolean
}

export interface QuoteClientInfo {
  name: string
  contactPerson?: string
  phone?: string
  email?: string
  address?: string
  taxNumber?: string
  crNumber?: string
}

export interface QuotePaymentMilestone {
  id: string
  name: string
  percentage: number
  amount: number
  notes?: string
}

export interface QuoteBankInfo {
  bankName: string
  accountName: string
  iban: string
}

export interface QuoteTermsInfo {
  validityDays: number
  expiryDate?: string
  terms: string[]
  bankInfo?: QuoteBankInfo
  notes?: string
}

export interface Quote {
  id: string
  number: string
  title: string
  client: string
  clientInfo?: QuoteClientInfo
  summary?: string
  status: QuoteStatus
  folderId: string | null
  updatedAt: string
  createdAt?: string
  deletedAt?: string | null
  accent: string
  items: QuoteItem[]
  moneyRules?: MoneyRules
  paymentSchedule?: QuotePaymentMilestone[]
  termsInfo?: QuoteTermsInfo
  pageSettings?: QuotePageSettings
  templateSnapshot: TemplateSnapshot
}

export interface QuoteFolder {
  id: string
  name: string
  color: string
}

export interface QuoteTemplate {
  id: string
  name: string
  note: string
  version: number
  color: string
  defaultMoneyRules: MoneyRules
  sample: Quote
}

export interface WorkspaceQuoteIndexEntry {
  id: string
  number: string
  title: string
  client: string
  status: QuoteStatus
  folderId: string | null
  updatedAt: string
  deletedAt?: string | null
  total: number
  fileName: string
}

export type SortOption =
  | 'updated-desc'
  | 'updated-asc'
  | 'title-asc'
  | 'client-asc'
  | 'total-desc'
  | 'total-asc'

export const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'updated-desc', label: 'آخر تعديل (الأحدث أولاً)' },
  { value: 'updated-asc', label: 'آخر تعديل (الأقدم أولاً)' },
  { value: 'title-asc', label: 'العنوان (أبجديًا)' },
  { value: 'client-asc', label: 'العميل (أبجديًا)' },
  { value: 'total-desc', label: 'الإجمالي (الأعلى أولاً)' },
  { value: 'total-asc', label: 'الإجمالي (الأقل أولاً)' },
]

export interface WorkspaceData {
  schemaVersion: 2
  workspaceId: string
  updatedAt: string
  quotes: Quote[]
  folders: QuoteFolder[]
}

export interface QuoteCalculationLine {
  id: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface QuoteCalculationResult {
  currency: 'SAR'
  fractionDigits: 2
  lines: QuoteCalculationLine[]
  subtotal: number
  discount: number
  taxableAmount: number
  taxRate: number
  tax: number
  total: number
}

export const DEFAULT_MONEY_RULES: MoneyRules = {
  currency: 'SAR',
  fractionDigits: 2,
  taxRate: 0,
  discountAmount: 0,
  discountPercent: 0,
  discountType: 'amount',
}

export const DEFAULT_TERMS: string[] = [
  'يسري هذا العرض لمدة 15 يومًا من تاريخ إصداره.',
  'يبدأ العمل فور استلام الدفعة المقدمة واعتماد نطاق العمل.',
  'يشمل العرض جولتين من المراجعات والتعديلات على المخرجات المحددة.',
  'أي متطلبات أو إضافات جديدة خارج نطاق العرض تخضع لملحق تسعير مستقل.',
  'تنتقل ملكية المخرجات النهائية للعميل فور سداد كامل مستحقات العرض.',
]

