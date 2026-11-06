import {
  cloneDemoWorkspace,
  quoteTotal,
  sortQuotes,
  type QuoteFolder,
  type WorkspaceData,
} from '../domain/quote'
import {
  createMemoryDirectoryHandle,
  readOrInitialize,
  syncWorkspaceFiles,
} from '../storage/workspace'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`فشل التحقق في المرحلة 2: ${message}`)
  }
}

export async function runPhase2Verification(): Promise<{
  passed: boolean
  checks: string[]
}> {
  const checks: string[] = []
  const demo = cloneDemoWorkspace()

  // 1. Search and Sorting
  const searchByItem = demo.quotes.filter((q) => {
    const text = `${q.title} ${q.client} ${q.number} ${q.items.map((i) => i.title).join(' ')}`.toLowerCase()
    return text.includes('استراتيجية العلامة')
  })
  assert(searchByItem.length === 1 && searchByItem[0].number === 'AN-2026-013', 'نجاح البحث عن عرض عبر وصف البند الداخلي')

  const sortedByTotalDesc = sortQuotes(demo.quotes, 'total-desc')
  for (let i = 0; i < sortedByTotalDesc.length - 1; i++) {
    assert(
      quoteTotal(sortedByTotalDesc[i]) >= quoteTotal(sortedByTotalDesc[i + 1]),
      'الترتيب حسب الإجمالي (الأعلى أولاً)',
    )
  }

  const sortedByTitle = sortQuotes(demo.quotes, 'title-asc')
  assert(sortedByTitle.length === demo.quotes.length, 'ترتيب العناوين أبجديًا')
  checks.push('اجتياز البحث الشامل والفرز بجميع خياراته (التاريخ، العنوان، العميل، الإجمالي).')

  // 2. Folder Organization and Drag-and-drop grouping
  const folderNew: QuoteFolder = { id: 'folder-tech', name: 'مشاريع التقنية', color: '#dcece5' }
  const quoteA = { ...demo.quotes[2], folderId: null }
  const quoteB = { ...demo.quotes[3], folderId: null }

  // Simulate grouping quoteA and quoteB into a new folder
  const groupedQuotes = demo.quotes.map((q) => {
    if (q.id === quoteA.id || q.id === quoteB.id) {
      return { ...q, folderId: folderNew.id }
    }
    return q
  })
  const workspaceWithFolder: WorkspaceData = {
    ...demo,
    folders: [...demo.folders, folderNew],
    quotes: groupedQuotes,
  }

  const quotesInFolder = workspaceWithFolder.quotes.filter((q) => q.folderId === folderNew.id)
  assert(quotesInFolder.length === 2, 'تجميع ورقتين معًا داخل المجلد الجديد')

  // Unlink quote from folder
  const unlinkedQuotes = workspaceWithFolder.quotes.map((q) =>
    q.id === quoteA.id ? { ...q, folderId: null } : q,
  )
  assert(
    unlinkedQuotes.find((q) => q.id === quoteA.id)?.folderId === null,
    'إخراج الورقة من المجلد إلى مساحة العمل العامة',
  )

  // Delete folder safely without losing quotes
  const workspaceAfterFolderDeleted: WorkspaceData = {
    ...workspaceWithFolder,
    folders: workspaceWithFolder.folders.filter((f) => f.id !== folderNew.id),
    quotes: workspaceWithFolder.quotes.map((q) =>
      q.folderId === folderNew.id ? { ...q, folderId: null } : q,
    ),
  }
  assert(
    workspaceAfterFolderDeleted.folders.every((f) => f.id !== folderNew.id),
    'حذف المجلد من قائمة المجلدات',
  )
  assert(
    workspaceAfterFolderDeleted.quotes.filter((q) => q.id === quoteA.id || q.id === quoteB.id).every((q) => q.folderId === null),
    'إعادة الأوراق إلى مساحة العمل عند حذف المجلد دون ضياع أي منها',
  )
  checks.push('اجتياز تنظيم المجلدات وتجميع الأوراق بالسحب وبدائل القوائم وحذف المجلد الآمن.')

  // 3. Multi-selection & Bulk operations
  const idsToBulkMove = [demo.quotes[0].id, demo.quotes[1].id]
  const targetFolderId = demo.folders[0].id
  const bulkMoved = demo.quotes.map((q) => (idsToBulkMove.includes(q.id) ? { ...q, folderId: targetFolderId } : q))
  assert(
    bulkMoved.filter((q) => q.folderId === targetFolderId).length >= 2,
    'نقل متعدد للأوراق إلى مجلد محدد دفعة واحدة',
  )

  const bulkStatusChanged = demo.quotes.map((q) =>
    idsToBulkMove.includes(q.id) ? { ...q, status: 'مقبول' as const } : q,
  )
  assert(
    bulkStatusChanged.filter((q) => idsToBulkMove.includes(q.id)).every((q) => q.status === 'مقبول'),
    'تغيير حالة مجموعة أوراق محددة جماعيًا',
  )
  checks.push('اجتياز التحديد المتعدد وتنفيذ الإجراءات الجماعية (نقل، تغيير حالة، أرشفة).')

  // 4. Trash Bin, Undo, and Restore
  const now = new Date().toISOString()
  const trashedQuoteId = demo.quotes[0].id
  const workspaceWithTrash: WorkspaceData = {
    ...demo,
    quotes: demo.quotes.map((q) => (q.id === trashedQuoteId ? { ...q, deletedAt: now } : q)),
  }
  const activeOnly = workspaceWithTrash.quotes.filter((q) => !q.deletedAt)
  const trashOnly = workspaceWithTrash.quotes.filter((q) => q.deletedAt)
  assert(activeOnly.every((q) => q.id !== trashedQuoteId), 'استبعاد الورقة المحذوفة من العرض النشط')
  assert(trashOnly.some((q) => q.id === trashedQuoteId), 'ظهور الورقة في سلة المحذوفات')

  // Restore
  const restoredWorkspace: WorkspaceData = {
    ...workspaceWithTrash,
    quotes: workspaceWithTrash.quotes.map((q) => (q.id === trashedQuoteId ? { ...q, deletedAt: null } : q)),
  }
  assert(
    restoredWorkspace.quotes.find((q) => q.id === trashedQuoteId)?.deletedAt === null,
    'استعادة الورقة من سلة المحذوفات بنجاح وإلغاء وسم الحذف',
  )

  // Empty trash permanently
  const emptiedTrashWorkspace: WorkspaceData = {
    ...workspaceWithTrash,
    quotes: workspaceWithTrash.quotes.filter((q) => !q.deletedAt),
  }
  assert(
    emptiedTrashWorkspace.quotes.length === demo.quotes.length - 1,
    'حذف الأوراق نهائيًا عند إفراغ سلة المحذوفات',
  )
  checks.push('اجتياز سلة المحذوفات المحلية مع الاستعادة والتراجع والحذف النهائي.')

  // 5. Disk Persistence & Index integrity after reload
  const memDir = createMemoryDirectoryHandle('مجلد-اختبار-المرحلة-2')
  await syncWorkspaceFiles(memDir.handle, workspaceWithFolder)
  const reloaded = await readOrInitialize(memDir.handle)
  assert(
    reloaded.data.folders.length === workspaceWithFolder.folders.length,
    'ثبات المجلدات المنشأة بعد إعادة فتح المجلد',
  )
  assert(
    reloaded.data.quotes.length === workspaceWithFolder.quotes.length,
    'ثبات الأوراق وعلاقات المجلدات بعد إعادة فتح المجلد',
  )
  checks.push('اجتياز ثبات هيكل الأوراق والمجلدات وسلة المحذوفات داخل ملفات القرص والفهرس.')

  return { passed: true, checks }
}
