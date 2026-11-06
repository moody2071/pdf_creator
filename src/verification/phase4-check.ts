import {
  analyzeQuoteWarnings,
  exportPrintableQuoteHtml,
  paginateQuoteDocument,
} from '../domain/pagination'
import {
  createQuoteFromTemplate,
  makeId,
  starterTemplates,
  type Quote,
} from '../domain/quote'
import {
  createMemoryDirectoryHandle,
  readOrInitialize,
  readQuoteFile,
  writeQuoteFile,
} from '../storage/workspace'

export interface Phase4VerificationResult {
  passed: boolean
  checks: {
    name: string
    passed: boolean
    detail: string
  }[]
}

export async function runPhase4Verification(): Promise<Phase4VerificationResult> {
  const checks: { name: string; passed: boolean; detail: string }[] = []
  const template = starterTemplates[0]

  // 1. Short quote (3 items) -> fits cleanly on 1 A4 page
  const shortQuote = createQuoteFromTemplate(template, 'AN-2026-401')
  const shortPaginated = paginateQuoteDocument(shortQuote)
  const shortPassed =
    shortPaginated.totalPages === 1 &&
    shortPaginated.pages[0].items.length === shortQuote.items.length &&
    shortPaginated.pages[0].showFinancialSummary &&
    shortPaginated.pages[0].showBankAndTerms &&
    shortPaginated.pages[0].showSignatures
  checks.push({
    name: 'short-quote-single-page',
    passed: shortPassed,
    detail: `Short quote (${shortQuote.items.length} items) -> totalPages=${shortPaginated.totalPages}`,
  })

  // 2. Long Arabic quote (14 items) -> automatic multi-page pagination with sequential numbering & table continuation
  const longItems = Array.from({ length: 14 }, (_, idx) => ({
    id: makeId(),
    title: `مرحلة العمل والتوريد رقم ${idx + 1} — تطوير وتكامل الأنظمة الرقمية`,
    description:
      'تحليل المتطلبات الفنية وبناء واجهات الاستخدام العربية المتجاوبة واختبار الأداء والتكامل مع قواعد البيانات المحلية.',
    quantity: (idx % 3) + 1,
    unitPrice: 4500 + idx * 500,
  }))
  const longQuote: Quote = {
    ...createQuoteFromTemplate(template, 'AN-2026-402'),
    title: 'مشروع التحول الرقمي وتطوير المنصة السحابية الشاملة',
    client: 'شركة الآفاق المتقدمة للتقنية والاتصالات',
    items: longItems,
  }
  const longPaginated = paginateQuoteDocument(longQuote)
  const totalDistributedItems = longPaginated.pages.reduce(
    (sum, page) => sum + page.items.length,
    0,
  )
  const allIndicesSequential = longPaginated.pages
    .flatMap((p) => p.items.map((r) => r.globalIndex))
    .every((val, i) => val === i + 1)
  const hasContinuationPage = longPaginated.pages.some((p) => p.isTableContinuation)
  const lastPage = longPaginated.pages[longPaginated.pages.length - 1]
  const longPassed =
    longPaginated.totalPages >= 2 &&
    totalDistributedItems === 14 &&
    allIndicesSequential &&
    hasContinuationPage &&
    lastPage.showSignatures
  checks.push({
    name: 'long-quote-multi-page-pagination',
    passed: longPassed,
    detail: `Long quote (14 items) -> totalPages=${longPaginated.totalPages}, distributed=${totalDistributedItems}, sequential=${allIndicesSequential}, continuation=${hasContinuationPage}`,
  })

  // 3. Manual item page break & section break
  const manualBreakQuote: Quote = {
    ...shortQuote,
    items: shortQuote.items.map((item, idx) =>
      idx === 1 ? { ...item, pageBreakBefore: true } : item,
    ),
    pageSettings: {
      marginPreset: 'normal',
      repeatTableHeader: true,
      breakBeforeMilestones: false,
      breakBeforeTerms: false,
      breakBeforeSignatures: true,
    },
  }
  const manualPaginated = paginateQuoteDocument(manualBreakQuote)
  const manualPassed =
    manualPaginated.totalPages >= 3 &&
    manualPaginated.pages[0].items.length === 1 &&
    manualPaginated.pages[1].items[0]?.globalIndex === 2 &&
    manualPaginated.pages[manualPaginated.pages.length - 1].showSignatures &&
    !manualPaginated.pages[0].showSignatures
  checks.push({
    name: 'manual-item-and-section-page-breaks',
    passed: manualPassed,
    detail: `Manual breaks -> totalPages=${manualPaginated.totalPages}, p1Items=${manualPaginated.pages[0].items.length}, p2FirstIndex=${manualPaginated.pages[1]?.items[0]?.globalIndex}`,
  })

  // 4. Margin preset impact (compact vs spacious)
  const compactPaginated = paginateQuoteDocument({
    ...longQuote,
    pageSettings: {
      marginPreset: 'compact',
      repeatTableHeader: true,
      breakBeforeMilestones: false,
      breakBeforeTerms: false,
      breakBeforeSignatures: false,
    },
  })
  const spaciousPaginated = paginateQuoteDocument({
    ...longQuote,
    pageSettings: {
      marginPreset: 'spacious',
      repeatTableHeader: true,
      breakBeforeMilestones: false,
      breakBeforeTerms: false,
      breakBeforeSignatures: false,
    },
  })
  const marginImpactPassed =
    compactPaginated.pages[0].items.length >= spaciousPaginated.pages[0].items.length &&
    compactPaginated.totalPages <= spaciousPaginated.totalPages
  checks.push({
    name: 'margin-presets-capacity',
    passed: marginImpactPassed,
    detail: `Compact p1 items=${compactPaginated.pages[0].items.length} (${compactPaginated.totalPages} pages) vs Spacious p1 items=${spaciousPaginated.pages[0].items.length} (${spaciousPaginated.totalPages} pages)`,
  })

  // 5. Contextual warnings detection
  const warningTestQuote: Quote = {
    ...shortQuote,
    client: 'عميل جديد',
    items: [
      ...shortQuote.items,
      { id: makeId(), title: 'بند بدون تسعير', quantity: 1, unitPrice: 0 },
    ],
    paymentSchedule: [
      { id: 'ms-1', name: 'دفعة أولى', percentage: 40, amount: 1000 },
      { id: 'ms-2', name: 'دفعة ثانية', percentage: 40, amount: 1000 },
    ],
  }
  const warnings = analyzeQuoteWarnings(
    warningTestQuote,
    paginateQuoteDocument(warningTestQuote),
  )
  const hasUnbalancedWarning = warnings.some((w) => w.id === 'unbalanced-milestones')
  const hasMissingClientWarning = warnings.some((w) => w.id === 'missing-client')
  const hasZeroPriceWarning = warnings.some((w) => w.id === 'zero-price-item')
  const warningsPassed =
    hasUnbalancedWarning && hasMissingClientWarning && hasZeroPriceWarning
  checks.push({
    name: 'contextual-warnings-detection',
    passed: warningsPassed,
    detail: `Detected warnings: ${warnings.map((w) => w.id).join(', ')}`,
  })

  // 6. Standalone Printable A4 HTML Export & Disk Persistence of Phase 4 fields
  const htmlOutput = exportPrintableQuoteHtml(longQuote)
  const htmlValid =
    htmlOutput.includes('<!DOCTYPE html>') &&
    htmlOutput.includes('dir="rtl"') &&
    htmlOutput.includes('@page { size: A4 portrait;') &&
    htmlOutput.includes(longQuote.title) &&
    htmlOutput.includes('تابع جدول التسعيرات')

  const memDir = createMemoryDirectoryHandle('phase4-verify-workspace').handle
  await readOrInitialize(memDir)
  await writeQuoteFile(memDir, manualBreakQuote)
  const reloadedQuote = await readQuoteFile(memDir, manualBreakQuote.id)
  const diskPersisted =
    Boolean(reloadedQuote?.items[1]?.pageBreakBefore) &&
    Boolean(reloadedQuote?.pageSettings?.breakBeforeSignatures)

  checks.push({
    name: 'printable-html-export-and-disk-persistence',
    passed: htmlValid && diskPersisted,
    detail: `HTML length=${htmlOutput.length}, htmlValid=${htmlValid}, diskPersisted=${diskPersisted}`,
  })

  return {
    passed: checks.every((c) => c.passed),
    checks,
  }
}
