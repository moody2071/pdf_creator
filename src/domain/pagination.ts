import {
  DEFAULT_TERMS,
  calculateQuote,
  type MarginPreset,
  type Quote,
  type QuoteItem,
  type QuotePageSettings,
} from './quote'

export type { MarginPreset, QuotePageSettings }
export { exportPrintableQuoteHtml } from './printable-html'

export interface PaginatedItemRow {
  item: QuoteItem
  globalIndex: number // 1-based index across the entire quote
  lineTotal: number
  isManualBreak?: boolean
}

export interface A4PageModel {
  pageNumber: number // 1-based
  totalPages: number
  isFirstPage: boolean
  showHeaderBanner: boolean
  showPartiesAndSummary: boolean
  items: PaginatedItemRow[]
  isTableContinuation: boolean
  hasMoreItemsAfter: boolean
  showFinancialSummary: boolean
  showMilestones: boolean
  showBankAndTerms: boolean
  showSignatures: boolean
  usedHeightUnits: number
  capacityUnits: number
  fillRatio: number
}

export type WarningActionType =
  | 'set-compact-margins'
  | 'balance-milestones'
  | 'break-before-terms'
  | 'break-before-signatures'
  | 'go-client'
  | 'go-items'

export interface QuoteDocumentWarning {
  id: string
  severity: 'warning' | 'info'
  title: string
  message: string
  suggestionLabel?: string
  actionType?: WarningActionType
  targetSection?: string
}

export interface PaginatedQuoteDocument {
  pages: A4PageModel[]
  totalPages: number
  settings: QuotePageSettings
  warnings: QuoteDocumentWarning[]
}

export const DEFAULT_PAGE_SETTINGS: QuotePageSettings = {
  marginPreset: 'normal',
  repeatTableHeader: true,
  breakBeforeMilestones: false,
  breakBeforeTerms: false,
  breakBeforeSignatures: false,
}

export function resolvePageSettings(quote: Pick<Quote, 'pageSettings'>): QuotePageSettings {
  const raw = quote.pageSettings
  if (!raw) return { ...DEFAULT_PAGE_SETTINGS }
  return {
    marginPreset:
      raw.marginPreset === 'compact' || raw.marginPreset === 'spacious'
        ? raw.marginPreset
        : 'normal',
    repeatTableHeader: raw.repeatTableHeader !== false,
    breakBeforeMilestones: Boolean(raw.breakBeforeMilestones),
    breakBeforeTerms: Boolean(raw.breakBeforeTerms),
    breakBeforeSignatures: Boolean(raw.breakBeforeSignatures),
  }
}

function getPageCapacityUnits(marginPreset: MarginPreset): number {
  switch (marginPreset) {
    case 'compact':
      return 1340
    case 'spacious':
      return 980
    case 'normal':
    default:
      return 1180
  }
}

function estimateSummaryHeight(summary?: string): number {
  const text = (summary || '').trim()
  const lines = Math.max(1, Math.ceil(text.length / 75))
  return 54 + lines * 18
}

function estimateItemRowHeight(item: QuoteItem): number {
  const titleLines = Math.max(1, Math.ceil((item.title || '').length / 42))
  const descLen = (item.description || '').trim().length
  const descLines = descLen > 0 ? Math.ceil(descLen / 52) : 0
  return 26 + titleLines * 16 + descLines * 14
}

function estimateMilestonesHeight(quote: Quote): number {
  const count = quote.paymentSchedule?.length ?? 0
  if (count === 0) return 0
  const rows = Math.ceil(count / 3)
  return 44 + rows * 76
}

function estimateBankAndTermsHeight(quote: Quote): number {
  const hasBank = Boolean(
    quote.termsInfo?.bankInfo?.iban ||
      quote.termsInfo?.bankInfo?.bankName ||
      quote.termsInfo?.bankInfo?.accountName,
  )
  const terms = quote.termsInfo?.terms ?? DEFAULT_TERMS
  const notes = (quote.termsInfo?.notes || '').trim()
  let h = 42 // section title
  if (hasBank) h += 64
  h += Math.max(1, terms.length) * 21 + 12
  if (notes) h += 38
  return h
}

const HEADER_BANNER_HEIGHT = 118
const CONTINUATION_HEADER_HEIGHT = 48
const PARTIES_GRID_HEIGHT = 86
const TABLE_SECTION_HEAD_HEIGHT = 68
const TABLE_CONTINUATION_HEAD_HEIGHT = 56
const FINANCIAL_SUMMARY_HEIGHT = 132
const SIGNATURES_BLOCK_HEIGHT = 148

export function paginateQuoteDocument(quote: Quote): PaginatedQuoteDocument {
  const settings = resolvePageSettings(quote)
  const capacity = getPageCapacityUnits(settings.marginPreset)
  const items = quote.items && quote.items.length > 0 ? quote.items : []
  const hasMilestones = Boolean(quote.paymentSchedule && quote.paymentSchedule.length > 0)

  const pages: A4PageModel[] = []

  function createEmptyPage(pageNumber: number, isFirstPage: boolean): A4PageModel {
    const baseHeight = isFirstPage
      ? HEADER_BANNER_HEIGHT + PARTIES_GRID_HEIGHT + estimateSummaryHeight(quote.summary)
      : CONTINUATION_HEADER_HEIGHT
    return {
      pageNumber,
      totalPages: 1,
      isFirstPage,
      showHeaderBanner: isFirstPage,
      showPartiesAndSummary: isFirstPage,
      items: [],
      isTableContinuation: false,
      hasMoreItemsAfter: false,
      showFinancialSummary: false,
      showMilestones: false,
      showBankAndTerms: false,
      showSignatures: false,
      usedHeightUnits: baseHeight,
      capacityUnits: capacity,
      fillRatio: 0,
    }
  }

  let currentPage = createEmptyPage(1, true)
  pages.push(currentPage)

  // Place pricing table items across pages
  items.forEach((item, index) => {
    const rowHeight = estimateItemRowHeight(item)
    const isFirstItemOnPage = currentPage.items.length === 0
    const tableOverhead = isFirstItemOnPage
      ? index === 0
        ? TABLE_SECTION_HEAD_HEIGHT
        : TABLE_CONTINUATION_HEAD_HEIGHT
      : 0

    const manualBreakRequested = index > 0 && item.pageBreakBefore === true
    const wouldOverflow =
      !isFirstItemOnPage && currentPage.usedHeightUnits + tableOverhead + rowHeight > capacity

    if (manualBreakRequested || wouldOverflow) {
      currentPage.hasMoreItemsAfter = true
      currentPage = createEmptyPage(pages.length + 1, false)
      currentPage.isTableContinuation = true
      pages.push(currentPage)
    }

    if (currentPage.items.length === 0) {
      currentPage.usedHeightUnits +=
        index === 0 ? TABLE_SECTION_HEAD_HEIGHT : TABLE_CONTINUATION_HEAD_HEIGHT
    }

    currentPage.items.push({
      item,
      globalIndex: index + 1,
      lineTotal: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
      isManualBreak: manualBreakRequested,
    })
    currentPage.usedHeightUnits += rowHeight
  })

  // 1. Place Financial Summary (Subtotal, Discount, VAT, Grand Total)
  if (
    currentPage.usedHeightUnits + FINANCIAL_SUMMARY_HEIGHT > capacity &&
    currentPage.items.length > 1
  ) {
    currentPage = createEmptyPage(pages.length + 1, false)
    pages.push(currentPage)
  }
  currentPage.showFinancialSummary = true
  currentPage.usedHeightUnits += FINANCIAL_SUMMARY_HEIGHT

  // 2. Place Payment Milestones (if any)
  if (hasMilestones) {
    const msHeight = estimateMilestonesHeight(quote)
    const forceBreak = settings.breakBeforeMilestones === true
    const overflow = currentPage.usedHeightUnits + msHeight > capacity
    if (forceBreak || overflow) {
      currentPage = createEmptyPage(pages.length + 1, false)
      pages.push(currentPage)
    }
    currentPage.showMilestones = true
    currentPage.usedHeightUnits += msHeight
  }

  // 3. Place Bank Info & Contractual Terms
  const termsHeight = estimateBankAndTermsHeight(quote)
  if (settings.breakBeforeTerms === true || currentPage.usedHeightUnits + termsHeight > capacity) {
    currentPage = createEmptyPage(pages.length + 1, false)
    pages.push(currentPage)
  }
  currentPage.showBankAndTerms = true
  currentPage.usedHeightUnits += termsHeight

  // 4. Place Official Approval & Signatures
  if (
    settings.breakBeforeSignatures === true ||
    currentPage.usedHeightUnits + SIGNATURES_BLOCK_HEIGHT > capacity
  ) {
    currentPage = createEmptyPage(pages.length + 1, false)
    pages.push(currentPage)
  }
  currentPage.showSignatures = true
  currentPage.usedHeightUnits += SIGNATURES_BLOCK_HEIGHT

  // Finalize totalPages & fillRatio
  const totalPages = pages.length
  pages.forEach((p, idx) => {
    p.pageNumber = idx + 1
    p.totalPages = totalPages
    p.fillRatio = Math.min(1, Math.round((p.usedHeightUnits / p.capacityUnits) * 100) / 100)
  })

  const docResult: PaginatedQuoteDocument = {
    pages,
    totalPages,
    settings,
    warnings: [],
  }
  docResult.warnings = analyzeQuoteWarnings(quote, docResult)
  return docResult
}

export function analyzeQuoteWarnings(
  quote: Quote,
  paginated: PaginatedQuoteDocument,
): QuoteDocumentWarning[] {
  const warnings: QuoteDocumentWarning[] = []
  const calc = calculateQuote(quote)

  // 1. Check sparse last page spill that could fit with compact margins
  if (paginated.totalPages > 1) {
    const lastPage = paginated.pages[paginated.pages.length - 1]
    const hasManualBreaks =
      quote.items.some((i, idx) => idx > 0 && i.pageBreakBefore) ||
      paginated.settings.breakBeforeMilestones ||
      paginated.settings.breakBeforeTerms ||
      paginated.settings.breakBeforeSignatures

    if (
      lastPage.fillRatio < 0.36 &&
      paginated.settings.marginPreset !== 'compact' &&
      !hasManualBreaks
    ) {
      warnings.push({
        id: 'sparse-last-page',
        severity: 'info',
        title: 'امتداد خفيف إلى صفحة إضافية',
        message: `الصفحة الأخيرة (${paginated.totalPages}) تحتوي على جزء بسيط من الوثيقة. يمكنك تفعيل الهوامش المضغوطة لضم المحتوى.`,
        suggestionLabel: 'تفعيل الهوامش المضغوطة',
        actionType: 'set-compact-margins',
      })
    }
  }

  // 2. Check payment milestones balance against grand total
  if (quote.paymentSchedule && quote.paymentSchedule.length > 0) {
    const percSum = quote.paymentSchedule.reduce((s, m) => s + (Number(m.percentage) || 0), 0)
    const amountSum = quote.paymentSchedule.reduce((s, m) => s + (Number(m.amount) || 0), 0)
    const diff = Math.abs(amountSum - calc.total)
    if (Math.round(percSum) !== 100 || diff > 1) {
      warnings.push({
        id: 'unbalanced-milestones',
        severity: 'warning',
        title: 'عدم تطابق جدول الدفعات مع الإجمالي',
        message: `مجموع نسب الدفعات الحالي (${percSum}%) أو مبالغها لا يطابق الإجمالي النهائي (${calc.total.toLocaleString('en-US')} ر.س).`,
        suggestionLabel: 'موازنة الدفعات تلقائيًا',
        actionType: 'balance-milestones',
        targetSection: 'الدفعات والشروط',
      })
    }
  }

  // 3. Check unusually long item descriptions that may crowd table rows
  const longDescItem = quote.items.find((it) => (it.description || '').trim().length > 210)
  if (longDescItem) {
    warnings.push({
      id: 'long-item-description',
      severity: 'info',
      title: 'وصف بند طويل في جدول الأسعار',
      message: `البند «${longDescItem.title || 'بدون عنوان'}» يحتوي على وصف مطوّل قد يزاحم الجدول عند الطباعة.`,
      suggestionLabel: 'مراجعة البنود',
      actionType: 'go-items',
      targetSection: 'البنود والأسعار',
    })
  }

  // 4. Check missing client name
  if (!quote.client || !quote.client.trim() || quote.client.trim() === 'عميل جديد') {
    warnings.push({
      id: 'missing-client',
      severity: 'warning',
      title: 'اسم العميل غير محدد',
      message: 'يُفضل إدخال اسم العميل أو الجهة المستفيدة قبل طباعة أو تصدير ملف PDF النهائي.',
      suggestionLabel: 'إدخال بيانات العميل',
      actionType: 'go-client',
      targetSection: 'العميل والمشروع',
    })
  }

  // 5. Check zero-price items
  const zeroItem = quote.items.find((it) => (Number(it.unitPrice) || 0) <= 0)
  if (zeroItem) {
    warnings.push({
      id: 'zero-price-item',
      severity: 'info',
      title: 'بنود بسعر صفري (0 ر.س)',
      message: `البند «${zeroItem.title || 'بند جديد'}» مسجل بسعر 0 ر.س.`,
      suggestionLabel: 'تعديل الأسعار',
      actionType: 'go-items',
      targetSection: 'البنود والأسعار',
    })
  }

  return warnings
}
