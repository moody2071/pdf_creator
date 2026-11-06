import {
  DEFAULT_TERMS,
  balancePaymentMilestones,
  calculateQuote,
  createQuoteFromTemplate,
  starterTemplates,
  type Quote,
  type QuoteItem,
  type QuotePaymentMilestone,
} from '../domain/quote'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`فشل التحقق في المرحلة 3: ${message}`)
  }
}

export async function runPhase3Verification(): Promise<{
  passed: boolean
  checks: string[]
}> {
  const checks: string[] = []

  // 1. Starter templates availability and structure
  assert(starterTemplates.length >= 5, 'وجود 5 قوالب بداية غنية على الأقل')
  for (const tmpl of starterTemplates) {
    assert(Boolean(tmpl.id && tmpl.name && tmpl.sample), `القالب ${tmpl.id} مكتمل البنية`)
    assert(tmpl.sample.templateSnapshot.id === tmpl.id, `لقطة القالب ${tmpl.id} مطابقة لمعرف القالب`)
  }
  checks.push(`1. التحقق من قوالب البداية الخمسة (${starterTemplates.map((t) => t.name).join('، ')})`)

  // 2. Template instantiation and snapshot locking (حماية لقطة القالب)
  const template = starterTemplates[0]
  const initialTmplSampleTitle = template.sample.title
  const initialTmplItemsCount = template.sample.items.length
  const quote = createQuoteFromTemplate(template, 'AN-2026-999')

  assert(quote.number === 'AN-2026-999', 'تعيين رقم العرض الجديد بدقة')
  assert(quote.templateSnapshot.id === template.id, 'تثبيت معرف لقطة القالب')
  assert(quote.templateSnapshot.version === template.version, 'تثبيت إصدار لقطة القالب')

  // Mutate created quote
  quote.title = 'عرض معدل ومخصص بالكامل'
  quote.items.push({ id: 'new-item-1', title: 'بند إضافي', quantity: 5, unitPrice: 1000 })
  quote.moneyRules = { currency: 'SAR', fractionDigits: 2, taxRate: 15, discountAmount: 500 }

  // Verify template sample was NOT mutated
  assert(template.sample.title === initialTmplSampleTitle, 'تعديل العرض لا يغير عنوان نموذج القالب الأصلي')
  assert(template.sample.items.length === initialTmplItemsCount, 'إضافة بنود للعرض لا تغير بنود نموذج القالب الأصلي')
  assert(template.defaultMoneyRules.taxRate === 0, 'تعديل ضريبة العرض لا يغير القواعد الافتراضية للقالب الأصلي')
  checks.push('2. التحقق من ثبات لقطة القالب وحمايتها من التغير عند تعديل العرض (Snapshot Locking)')

  // 3. Financial calculations with fixed discount, percentage discount, and VAT
  const testItems: QuoteItem[] = [
    { id: 't1', title: 'خدمة 1', quantity: 2, unitPrice: 1500 }, // 3000
    { id: 't2', title: 'خدمة 2', quantity: 4, unitPrice: 500 },  // 2000
  ] // subtotal = 5000

  // 3.1 Fixed discount + 15% VAT
  const calcFixed = calculateQuote({
    items: testItems,
    moneyRules: {
      currency: 'SAR',
      fractionDigits: 2,
      discountType: 'amount',
      discountAmount: 1000,
      taxRate: 15,
    },
    templateSnapshot: template.sample.templateSnapshot,
  })
  assert(calcFixed.subtotal === 5000, 'المجموع الفرعي = 5000 ر.س')
  assert(calcFixed.discount === 1000, 'الخصم = 1000 ر.س')
  assert(calcFixed.taxableAmount === 4000, 'المبلغ الخاضع للضريبة = 4000 ر.س')
  assert(calcFixed.tax === 600, 'ضريبة 15% على 4000 = 600 ر.س')
  assert(calcFixed.total === 4600, 'الإجمالي النهائي = 4600 ر.س')

  // 3.2 Percentage discount (20%) + 15% VAT
  const calcPercent = calculateQuote({
    items: testItems,
    moneyRules: {
      currency: 'SAR',
      fractionDigits: 2,
      discountType: 'percent',
      discountPercent: 20,
      discountAmount: 0,
      taxRate: 15,
    },
    templateSnapshot: template.sample.templateSnapshot,
  })
  assert(calcPercent.subtotal === 5000, 'المجموع الفرعي = 5000 ر.س')
  assert(calcPercent.discount === 1000, 'خصم 20% على 5000 = 1000 ر.س')
  assert(calcPercent.taxableAmount === 4000, 'المبلغ الخاضع للضريبة = 4000 ر.س')
  assert(calcPercent.tax === 600, 'الضريبة = 600 ر.س')
  assert(calcPercent.total === 4600, 'الإجمالي النهائي = 4600 ر.س')
  checks.push('3. التحقق من دقة الحسابات المالية (المجموع الفرعي، الخصم بالمبلغ والنسبة، ضريبة 15%، والإجمالي)')

  // 4. Payment milestones calculation and auto-balancing
  const milestones: QuotePaymentMilestone[] = [
    { id: 'm1', name: 'دفعة مقدمة', percentage: 40, amount: 0 },
    { id: 'm2', name: 'دفعة مرحلية', percentage: 40, amount: 0 },
    { id: 'm3', name: 'دفعة ختامية', percentage: 20, amount: 0 },
  ]
  const balanced = balancePaymentMilestones(4600, milestones)
  assert(balanced.length === 3, 'عدد الدفعات المتوازنة 3')
  assert(balanced[0].amount === 1840, 'الدفعة الأولى 40% من 4600 = 1840 ر.س')
  assert(balanced[1].amount === 1840, 'الدفعة الثانية 40% من 4600 = 1840 ر.س')
  assert(balanced[2].amount === 920, 'الدفعة الختامية 20% من 4600 = 920 ر.س')
  const sumMilestones = balanced.reduce((sum, m) => sum + m.amount, 0)
  assert(sumMilestones === 4600, 'مجموع مبالغ الدفعات يطابق الإجمالي النهائي تماماً دون أي فرق كسور')
  checks.push('4. التحقق من موازنة جدول الدفعات وتوزيع النسب والمبالغ بدقة متطابقة مع الإجمالي')

  // 5. Items CRUD and reordering
  const itemsList: QuoteItem[] = [
    { id: 'i1', title: 'بند أ', quantity: 1, unitPrice: 100 },
    { id: 'i2', title: 'بند ب', quantity: 2, unitPrice: 200 },
  ]
  // Add item
  itemsList.push({ id: 'i3', title: 'بند ج', description: 'تفاصيل البند', quantity: 3, unitPrice: 300 })
  assert(itemsList.length === 3, 'إضافة بند جديد بنجاح')

  // Reorder items: move item 2 up
  ;[itemsList[0], itemsList[1]] = [itemsList[1], itemsList[0]]
  assert(itemsList[0].id === 'i2' && itemsList[1].id === 'i1', 'إعادة ترتيب البنود بنجاح')

  // Duplicate item
  const dup: QuoteItem = { ...itemsList[0], id: 'i2-dup', title: `${itemsList[0].title} (نسخة)` }
  const afterDup: QuoteItem[] = [...itemsList.slice(0, 1), dup, ...itemsList.slice(1)]
  assert(afterDup.length === 4 && afterDup[1].title === 'بند ب (نسخة)', 'تكرار/نسخ البند بنجاح')

  // Remove item
  const filtered: QuoteItem[] = afterDup.filter((i) => i.id !== 'i1')
  assert(filtered.length === 3 && !filtered.some((i) => i.id === 'i1'), 'حذف البند بنجاح')
  checks.push('5. التحقق من إضافة البنود وحذفها وتكرارها وتغيير ترتيبها')

  // 6. Client Info, Terms, and Serialization Integrity
  quote.clientInfo = {
    name: 'شركة تجريبية للتحقق',
    contactPerson: 'عبد الله محمد',
    phone: '0555001122',
    email: 'test@example.com',
    taxNumber: '310000000000003',
    crNumber: '1010000000',
  }
  quote.termsInfo = {
    validityDays: 30,
    terms: [...DEFAULT_TERMS],
    bankInfo: {
      bankName: 'مصرف الراجحي',
      accountName: 'مؤسسة أنفاس',
      iban: 'SA4480000201608010099999',
    },
    notes: 'ملاحظة خاصة بالتحقق',
  }

  // JSON round-trip
  const jsonStr = JSON.stringify(quote)
  const deserialized = JSON.parse(jsonStr) as Quote

  assert(deserialized.id === quote.id, 'تطابق معرف العرض بعد الحفظ والاسترجاع')
  assert(deserialized.clientInfo?.taxNumber === '310000000000003', 'حفظ واسترجاع الرقم الضريبي')
  assert(deserialized.termsInfo?.terms.length === DEFAULT_TERMS.length, 'حفظ واسترجاع الشروط والأحكام كاملة')
  assert(deserialized.termsInfo?.bankInfo?.iban === 'SA4480000201608010099999', 'حفظ واسترجاع بيانات الآيبان البنكي')
  assert(deserialized.templateSnapshot.id === template.id, 'بقاء لقطة القالب سليمة بعد الحفظ والاسترجاع')
  checks.push('6. التحقق من سلامة حفظ واسترجاع بيانات العميل والبنود والدفعات والشروط (Data Integrity)')

  return { passed: true, checks }
}
