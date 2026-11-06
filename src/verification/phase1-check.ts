import {
  calculateQuote,
  cloneDemoWorkspace,
  makeId,
  roundMoney,
  type Quote,
  type WorkspaceData,
} from '../domain/quote'
import {
  FOLDERS_DIR,
  QUOTES_DIR,
  WORKSPACE_FILE,
  createEmptyWorkspace,
  createMemoryDirectoryHandle,
  deleteQuoteFile,
  loadRecoverySnapshot,
  migrateWorkspace,
  persistWorkspaceToFolder,
  readOrInitialize,
  readQuoteFile,
  rebuildWorkspaceIndex,
  reconnectWorkspace,
  saveHandle,
  syncWorkspaceFiles,
  writeQuoteFile,
} from '../storage/workspace'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`فشل التحقق: ${message}`)
  }
}

export async function runPhase1Verification(): Promise<{
  passed: boolean
  checks: string[]
}> {
  const checks: string[] = []

  // 1. Reference financial calculations
  assert(roundMoney(1.005, 2) === 1.01, 'تقريب 1.005 يجب أن يساوي 1.01')
  assert(roundMoney(0.1 + 0.2, 2) === 0.3, 'تقريب 0.1 + 0.2 يجب أن يساوي 0.3')

  const demo = cloneDemoWorkspace()
  const calc1 = calculateQuote(demo.quotes[0])
  assert(calc1.subtotal === 15300 && calc1.total === 15300, 'حساب العرض المرجعي الأول 15,300 ريال')

  const vatQuote: Quote = {
    ...demo.quotes[0],
    items: [
      { id: 'item-a', title: 'إدارة شهرية', quantity: 3, unitPrice: 4200 },
      { id: 'item-b', title: 'تصميم قوالب', quantity: 2, unitPrice: 1250.5 },
    ],
    moneyRules: {
      currency: 'SAR',
      fractionDigits: 2,
      discountAmount: 1101,
      taxRate: 15,
    },
  }
  const calc2 = calculateQuote(vatQuote)
  assert(calc2.subtotal === 15101, `المجموع الفرعي المتوقع 15101 والفعلي ${calc2.subtotal}`)
  assert(calc2.discount === 1101, 'قيمة الخصم 1101')
  assert(calc2.taxableAmount === 14000, 'المبلغ الخاضع للضريبة 14000')
  assert(calc2.tax === 2100, 'ضريبة القيمة المضافة 15% تساوي 2100')
  assert(calc2.total === 16100, 'الإجمالي النهائي مع الضريبة 16100')

  const precisionQuote: Quote = {
    ...demo.quotes[0],
    items: [
      { id: 'p-1', title: 'بند كسري', quantity: 3, unitPrice: 33.33 },
      { id: 'p-2', title: 'بند تقريب نصفي', quantity: 1, unitPrice: 1.005 },
    ],
    moneyRules: {
      currency: 'SAR',
      fractionDigits: 2,
      discountAmount: 0.5,
      taxRate: 15,
    },
  }
  const calc3 = calculateQuote(precisionQuote)
  assert(calc3.subtotal === 101, `المجموع الفرعي الدقيق 101 والفعلي ${calc3.subtotal}`)
  assert(calc3.taxableAmount === 100.5, 'الخاضع للضريبة 100.5')
  assert(calc3.tax === 15.08, `الضريبة المقربة 15.08 والفعلي ${calc3.tax}`)
  assert(calc3.total === 115.58, `الإجمالي المقرب 115.58 والفعلي ${calc3.total}`)

  const edgeQuote: Quote = {
    ...demo.quotes[0],
    items: [{ id: 'e-1', title: 'بند', quantity: -5, unitPrice: 100 }],
    moneyRules: { currency: 'SAR', fractionDigits: 2, discountAmount: 500, taxRate: 15 },
  }
  const calcEdge = calculateQuote(edgeQuote)
  assert(calcEdge.subtotal === 0 && calcEdge.discount === 0 && calcEdge.total === 0, 'حماية القيم السالبة والخصم الأعلى من المجموع')
  checks.push('اجتياز محرك الحسابات المالي للأمثلة المرجعية والكسور والضريبة 15% وحالات الحافة.')

  // 2. Schema validation & v1 -> v2 migration
  const v1Payload = {
    schemaVersion: 1,
    quotes: demo.quotes,
    folders: demo.folders,
  }
  const migratedV2 = migrateWorkspace(v1Payload)
  assert(migratedV2 !== null && migratedV2.schemaVersion === 2 && Boolean(migratedV2.workspaceId), 'ترحيل مخطط v1 إلى v2')

  const duplicateIdPayload = {
    ...demo,
    quotes: [demo.quotes[0], { ...demo.quotes[1], id: demo.quotes[0].id }],
  }
  assert(migrateWorkspace(duplicateIdPayload) === null, 'رفض المعرفات المكررة')
  checks.push('اجتياز التحقق البنيوي وترحيل المخطط من v1 إلى v2 ورفض البيانات التالفة.')

  // 3. Directory initialization, CRUD files, and index rebuilding
  const memDir = createMemoryDirectoryHandle('مجلد-اختبار-أنفاس')
  const initResult = await readOrInitialize(memDir.handle)
  assert(initResult.data.quotes.length === 0, 'إنشاء مساحة عمل فارغة جديدة عند فتح مجلد فارغ')
  assert(Boolean(memDir.getFileText(WORKSPACE_FILE)), 'إنشاء ملف الفهرس anfas-workspace.json')

  const populatedWorkspace: WorkspaceData = {
    ...createEmptyWorkspace(initResult.data.workspaceId),
    folders: demo.folders,
    quotes: demo.quotes,
  }
  await syncWorkspaceFiles(memDir.handle, populatedWorkspace)
  assert(
    Boolean(memDir.getFileText(`${QUOTES_DIR}/${demo.quotes[0].id}.json`)),
    'حفظ ملفات العروض الفردية داخل مجلد quotes/',
  )
  assert(
    Boolean(memDir.getFileText(`${FOLDERS_DIR}/${demo.folders[0].id}.json`)),
    'حفظ ملفات المجلدات الفردية داخل مجلد folders/',
  )

  // CRUD on single quote file
  const customQuote: Quote = {
    ...demo.quotes[0],
    id: 'quote-crud-test',
    number: 'AN-2026-999',
    title: 'عرض اختبار ملفات',
  }
  await writeQuoteFile(memDir.handle, customQuote)
  const readBackQuote = await readQuoteFile(memDir.handle, 'quote-crud-test')
  assert(readBackQuote?.number === 'AN-2026-999', 'قراءة ملف عرض منفرد بعد كتابته')
  const deletedOk = await deleteQuoteFile(memDir.handle, 'quote-crud-test')
  assert(deletedOk && (await readQuoteFile(memDir.handle, 'quote-crud-test')) === null, 'حذف ملف عرض منفرد')

  // Delete index file and verify rebuildWorkspaceIndex / readOrInitialize reconstructs it from entity files
  memDir.deletePath(WORKSPACE_FILE)
  assert(!memDir.getFileText(WORKSPACE_FILE), 'حذف ملف الفهرس لاختبار إعادة البناء')
  const reopened = await readOrInitialize(memDir.handle)
  assert(reopened.indexRebuilt === true, 'اكتشاف غياب الفهرس وإعادة بنائه تلقائيًا')
  assert(
    reopened.data.quotes.length === demo.quotes.length &&
      reopened.data.folders.length === demo.folders.length,
    'استعادة جميع العروض والمجلدات من الملفات الفردية عند إعادة بناء الفهرس',
  )
  const rebuiltResult = await rebuildWorkspaceIndex(memDir.handle)
  assert(rebuiltResult.data.quotes.length === demo.quotes.length, 'نجاح دالة rebuildWorkspaceIndex الصريحة')
  checks.push('اجتياز إنشاء المساحة وملفاتها الفردية، وإعادة فتحها، وإعادة بناء الفهرس عند فقدانه.')

  // 4. Permission loss, write failure, and zero data loss verification
  await saveHandle(memDir.handle)
  const connected = await reconnectWorkspace(false)
  assert(connected !== null && connected.name === 'مجلد-اختبار-أنفاس', 'استعادة المجلد المرتبط عند توفر الإذن')

  // Simulate permission lost during editing
  memDir.setPermission('prompt')
  const editedAfterPermissionLost: WorkspaceData = {
    ...reopened.data,
    quotes: [
      {
        ...demo.quotes[0],
        id: makeId(),
        number: 'AN-2026-777',
        title: 'عرض أُضيف أثناء انقطاع الإذن',
      },
      ...reopened.data.quotes,
    ],
  }
  const permLostSave = await persistWorkspaceToFolder(editedAfterPermissionLost)
  assert(
    permLostSave.ok === false &&
      permLostSave.reason === 'permission-lost' &&
      permLostSave.recoverySaved === true,
    'كشف انقطاع إذن المجلد وحفظ التعديلات في مساحة الاسترداد المؤقتة',
  )
  const recoveryAfterPermLost = loadRecoverySnapshot()
  assert(
    recoveryAfterPermLost?.pendingSync === true &&
      recoveryAfterPermLost.data.quotes.some((q) => q.number === 'AN-2026-777'),
    'ثبات التعديلات المعلقة في مساحة الاسترداد دون فقد',
  )

  // Simulate write error even when permission is granted
  memDir.setPermission('granted')
  memDir.setFailWrites(true)
  const beforeFailedWriteManifest = memDir.getFileText(WORKSPACE_FILE)
  const writeErrSave = await persistWorkspaceToFolder(editedAfterPermissionLost)
  assert(
    writeErrSave.ok === false &&
      writeErrSave.reason === 'write-error' &&
      writeErrSave.recoverySaved === true,
    'التعامل الآمن مع فشل الكتابة على القرص وعدم ادعاء الحفظ',
  )
  assert(
    memDir.getFileText(WORKSPACE_FILE) === beforeFailedWriteManifest,
    'عدم تلف الملف السابق على القرص عند فشل الكتابة',
  )

  // Restore disk write and reconnect with pending data flush
  memDir.setFailWrites(false)
  memDir.setPermission('prompt')
  const reconnectedAfterFlush = await reconnectWorkspace(true, editedAfterPermissionLost)
  assert(
    reconnectedAfterFlush !== null &&
      reconnectedAfterFlush.data.quotes.some((q) => q.number === 'AN-2026-777'),
    'إعادة ربط المجلد بطلب الإذن ومزامنة التعديلات المعلقة دون فقد أي بيانات',
  )
  assert(
    Boolean(
      memDir.getFileText(
        `${QUOTES_DIR}/${editedAfterPermissionLost.quotes[0].id}.json`,
      ),
    ),
    'كتابة العرض المعلق فعليًا إلى مجلد quotes/ بعد استعادة الربط',
  )
  checks.push('اجتياز اختبارات انقطاع الإذن وفشل الكتابة واستعادة الربط مع إثبات عدم فقد أي بيانات.')

  return { passed: true, checks }
}

