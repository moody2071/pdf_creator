import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, RotateCcw, X } from 'lucide-react'
import {
  exportPrintableQuoteHtml,
  paginateQuoteDocument,
  resolvePageSettings,
  type QuoteDocumentWarning,
} from '../domain/pagination'
import {
  balancePaymentMilestones,
  calculateQuote,
  cloneDemoWorkspace,
  createQuoteFromTemplate,
  makeId,
  sortQuotes,
  starterTemplates,
  type Quote,
  type QuoteFolder,
  type QuoteStatus,
  type SortOption,
  type WorkspaceData,
} from '../domain/quote'
import {
  chooseWorkspaceFolder,
  clearSavedHandle,
  createEmptyWorkspace,
  exportWorkspaceJsonString,
  hasSavedWorkspaceLink,
  loadRecoverySnapshot,
  loadWorkspace,
  parseImportedWorkspaceJson,
  persistWorkspaceToFolder,
  rebuildLinkedWorkspaceIndex,
  reconnectWorkspace,
  saveRecoverySnapshot,
  saveWorkspace,
  supportsDirectoryPicker,
} from '../storage/workspace'
import { AppleModalDialog } from './components/AppleModalDialog'
import { GameTutorialQuest } from './components/GameTutorialQuest'
import { GlobalBar } from './components/GlobalBar'
import { InteractiveTipsModal } from './components/InteractiveTipsModal'
import { LibraryScreen } from './screens/LibraryScreen'
import { QuoteEditorScreen } from './screens/QuoteEditorScreen'
import { TemplateDesignerScreen } from './screens/TemplateDesignerScreen'
import { TemplatePickerScreen } from './screens/TemplatePickerScreen'
import {
  FOLDER_COLORS,
  type DialogConfig,
  type SaveState,
  type Screen,
  type WorkspaceMode,
} from './types'

export default function App() {
  const [data, setData] = useState<WorkspaceData>(() => loadWorkspace())
  const [screen, setScreen] = useState<Screen>('library')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'الكل' | QuoteStatus>('الكل')
  const [templateFilter, setTemplateFilter] = useState('all')
  const [sortOption, setSortOption] = useState<SortOption>('updated-desc')
  const [folderId, setFolderId] = useState<string | null>(null)
  const [gridSize, setGridSize] = useState<'compact' | 'small' | 'medium' | 'large'>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('tiras-grid-size-v2')
      if (saved === 'compact' || saved === 'small' || saved === 'medium' || saved === 'large') {
        return saved
      }
    }
    return 'compact'
  })

  const handleSetGridSize = (size: 'compact' | 'small' | 'medium' | 'large') => {
    setGridSize(size)
    try {
      localStorage.setItem('tiras-grid-size-v2', size)
    } catch {}
  }
  const [isTrashView, setIsTrashView] = useState(false)
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([])
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)

  const workspaceMenuOpen = activeMenuId === 'workspace'
  const setWorkspaceMenuOpen = (open: boolean | ((curr: boolean) => boolean)) => {
    setActiveMenuId((curr) => {
      const next = typeof open === 'function' ? open(curr === 'workspace') : open
      return next ? 'workspace' : null
    })
  }

  const bulkFolderSelectOpen = activeMenuId === 'bulk-folder'
  const setBulkFolderSelectOpen = (open: boolean | ((curr: boolean) => boolean)) => {
    setActiveMenuId((curr) => {
      const next = typeof open === 'function' ? open(curr === 'bulk-folder') : open
      return next ? 'bulk-folder' : null
    })
  }

  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('browser')
  const [workspaceName, setWorkspaceName] = useState('حفظ مؤقت')
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [folderFileCount, setFolderFileCount] = useState<number>(0)

  const [toast, setToast] = useState('')
  const [toastUndoAction, setToastUndoAction] = useState<(() => void) | null>(null)

  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null)
  const [activeTemplateId, setActiveTemplateId] = useState('classic')
  const [selectedSection, setSelectedSection] = useState('بيانات العرض')
  const [designerSection, setDesignerSection] = useState('رأس العرض')

  const [dragQuoteId, setDragQuoteId] = useState<string | null>(null)
  const [dragTargetId, setDragTargetId] = useState<string | null>(null)
  const [dragTargetType, setDragTargetType] = useState<'quote' | 'folder' | null>(null)
  const [absorbingDrop, setAbsorbingDrop] = useState<{
    quoteId: string
    folderId: string
    quoteTitle: string
    quoteNumber: string
    quoteAccent: string
  } | null>(null)

  const [mergingQuotes, setMergingQuotes] = useState<{
    sourceId: string
    targetId: string
    sourceQuote: Quote
    targetQuote: Quote
    newFolderId: string
    newFolderName: string
    newFolderColor: string
  } | null>(null)

  const [deletingQuoteId, setDeletingQuoteId] = useState<string | null>(null)
  const [flyingFolderId, setFlyingFolderId] = useState<string | null>(null)
  const [activeDialog, setActiveDialog] = useState<DialogConfig | null>(null)
  const [gestureTipsOpen, setGestureTipsOpen] = useState(false)
  const [tutorialActive, setTutorialActive] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(1)

  const startGamifiedTutorial = () => {
    setScreen('library')
    setFolderId(null)
    setIsTrashView(false)
    setQuery('')
    setSelectedQuoteIds([])
    // Ensure at least 3 starter quotes exist for the user to fold, merge, and drop
    if (data.quotes.filter((q) => !q.deletedAt).length < 3) {
      const demo = cloneDemoWorkspace()
      setData((prev) => ({
        ...prev,
        quotes: [
          ...prev.quotes,
          ...demo.quotes.slice(0, 3).map((dq) => ({ ...dq, id: makeId() })),
        ],
      }))
    }
    setTutorialActive(true)
    setTutorialStep(1)
    setToast('🎮 مرحباً بك في طور التدريب التفاعلي! اتبع المهمات خطوة بخطوة')
  }

  // Tutorial Step 1 monitor: detects quote selection and paper fold curl
  useEffect(() => {
    if (tutorialActive && tutorialStep === 1 && selectedQuoteIds.length > 0) {
      setToast('✨ أحسنت! انثنت زاوية الورقة وانتقلت إلى مستند التحديد أسفل الشاشة!')
      const timer = window.setTimeout(() => {
        setTutorialStep(2)
      }, 1400)
      return () => window.clearTimeout(timer)
    }
  }, [tutorialActive, tutorialStep, selectedQuoteIds.length])

  const showConfirm = (config: Omit<DialogConfig & { type: 'confirm' }, 'type'>) => {
    setActiveDialog({ ...config, type: 'confirm' })
  }

  const showPrompt = (config: Omit<DialogConfig & { type: 'prompt' }, 'type'>) => {
    setActiveDialog({ ...config, type: 'prompt' })
  }

  // Global dismissal for popup menus on outside-click or Escape
  useEffect(() => {
    if (!activeMenuId) return

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target?.closest('.tile-menu') ||
        target?.closest('.folder-submenu') ||
        target?.closest('.tile-menu-anchor') ||
        target?.closest('.workspace-popover') ||
        target?.closest('.workspace-connection') ||
        target?.closest('.bulk-dropdown-anchor') ||
        target?.closest('.bulk-dropdown-menu')
      ) {
        return
      }
      setActiveMenuId(null)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenuId(null)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeMenuId])

  useEffect(() => {
    setActiveMenuId(null)
  }, [screen, folderId, isTrashView, query])

  const revisionRef = useRef(0)
  const debounceTimerRef = useRef<number | null>(null)
  const writeChainRef = useRef<Promise<void>>(Promise.resolve())
  const hasPendingFolderSyncRef = useRef(false)
  const workspaceModeRef = useRef<WorkspaceMode>(workspaceMode)
  const workspaceNameRef = useRef<string>(workspaceName)
  const dataRef = useRef<WorkspaceData>(data)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  workspaceModeRef.current = workspaceMode
  workspaceNameRef.current = workspaceName
  dataRef.current = data

  const schedulePersistence = (nextData: WorkspaceData, targetRevision: number) => {
    const mode = workspaceModeRef.current
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    if (mode === 'memory') {
      debounceTimerRef.current = window.setTimeout(() => {
        if (revisionRef.current === targetRevision) {
          setSaveState('saved')
          setSaveErrorMessage(null)
          setLastSavedAt(new Date().toISOString())
        }
      }, 120)
      return
    }

    if (mode === 'reconnect') {
      hasPendingFolderSyncRef.current = true
      saveRecoverySnapshot(nextData, true, workspaceNameRef.current)
      setSaveState('pending-reconnect')
      setSaveErrorMessage('انقطع إذن المجلد — آخر التعديلات محفوظة مؤقتًا وتنتظر إعادة ربط المجلد.')
      return
    }

    if (mode === 'browser') {
      debounceTimerRef.current = window.setTimeout(() => {
        const stored = saveWorkspace(nextData)
        if (revisionRef.current === targetRevision) {
          setSaveState(stored ? 'saved' : 'write-error')
          setSaveErrorMessage(stored ? null : 'تعذر الحفظ في تخزين المتصفح.')
          if (stored) setLastSavedAt(new Date().toISOString())
        }
      }, 220)
      return
    }

    hasPendingFolderSyncRef.current = true
    saveRecoverySnapshot(nextData, true, workspaceNameRef.current)

    debounceTimerRef.current = window.setTimeout(() => {
      writeChainRef.current = writeChainRef.current.then(async () => {
        if (revisionRef.current !== targetRevision) return
        const result = await persistWorkspaceToFolder(nextData)
        if (revisionRef.current !== targetRevision) return

        if (result.ok) {
          hasPendingFolderSyncRef.current = false
          setSaveState('saved')
          setSaveErrorMessage(null)
          setLastSavedAt(result.savedAt ?? new Date().toISOString())
          if (typeof result.fileCount === 'number') {
            setFolderFileCount(result.fileCount)
          }
        } else if (result.reason === 'permission-lost') {
          hasPendingFolderSyncRef.current = true
          setWorkspaceMode('reconnect')
          setSaveState('pending-reconnect')
          setSaveErrorMessage(
            result.message ??
              'انقطع إذن الوصول إلى المجلد. آخر التعديلات محفوظة مؤقتًا وتحتاج إعادة ربط المجلد.',
          )
        } else {
          hasPendingFolderSyncRef.current = true
          setSaveState('write-error')
          setSaveErrorMessage(
            result.message ?? 'تعذر حفظ التغييرات في المجلد. تعديلاتك محفوظة مؤقتًا ولم تُفقد.',
          )
        }
      })
    }, 250)
  }

  const commitWorkspace = (updater: WorkspaceData | ((current: WorkspaceData) => WorkspaceData)) => {
    const current = dataRef.current
    const computed = typeof updater === 'function' ? updater(current) : updater
    const nextData: WorkspaceData = {
      ...computed,
      updatedAt: new Date().toISOString(),
    }
    dataRef.current = nextData
    revisionRef.current += 1
    const targetRevision = revisionRef.current

    if (workspaceModeRef.current === 'reconnect') {
      setSaveState('pending-reconnect')
    } else {
      setSaveState('saving')
    }
    setData(nextData)
    schedulePersistence(nextData, targetRevision)
  }

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (screen !== 'library') setScreen('library')
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [screen])

  // Hydration on mount
  useEffect(() => {
    let cancelled = false
    const recovery = loadRecoverySnapshot()

    hasSavedWorkspaceLink()
      .then(async (hasLink) => {
        if (!hasLink) return { hasLink: false, link: null }
        const pendingData = recovery?.pendingSync ? recovery.data : null
        const link = await reconnectWorkspace(false, pendingData)
        return { hasLink: true, link }
      })
      .then(({ hasLink, link }) => {
        if (cancelled) return
        if (link) {
          hasPendingFolderSyncRef.current = false
          dataRef.current = link.data
          setData(link.data)
          setWorkspaceName(link.name)
          setWorkspaceMode('folder')
          setSaveState('saved')
          setSaveErrorMessage(null)
          setFolderFileCount(link.fileCount)
          setLastSavedAt(link.data.updatedAt)
          if (link.indexRebuilt) {
            setToast('تمت قراءة المجلد وإعادة بناء الفهرس تلقائيًا')
          }
        } else if (hasLink) {
          if (recovery?.pendingSync) {
            hasPendingFolderSyncRef.current = true
            dataRef.current = recovery.data
            setData(recovery.data)
          }
          if (recovery?.workspaceName) {
            setWorkspaceName(recovery.workspaceName)
          }
          setWorkspaceMode('reconnect')
          setSaveState('pending-reconnect')
          setSaveErrorMessage(
            'انقطع إذن المجلد المحفوظ. أعد ربط المجلد لاستئناف الحفظ المباشر في ملفاتك.',
          )
        } else {
          setWorkspaceMode('browser')
          setWorkspaceName('حفظ مؤقت')
          setSaveState('saved')
        }
      })
      .catch((error) => {
        if (cancelled) return
        setWorkspaceMode('browser')
        setSaveState('write-error')
        setSaveErrorMessage(
          error instanceof Error ? error.message : 'تعذر قراءة مجلد مساحة العمل المحفوظ.',
        )
      })

    return () => {
      cancelled = true
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => {
      setToast('')
      setToastUndoAction(null)
    }, 4500)
    return () => window.clearTimeout(timer)
  }, [toast])

  // Active or Trashed quotes
  const visibleQuotes = useMemo(() => {
    let pool = isTrashView
      ? data.quotes.filter((q) => Boolean(q.deletedAt))
      : data.quotes.filter((q) => !q.deletedAt)

    if (query.trim()) {
      const q = query.trim().toLowerCase()
      pool = pool.filter((quote) => {
        const text = `${quote.title} ${quote.client} ${quote.number} ${quote.items.map((i) => i.title).join(' ')}`.toLowerCase()
        return text.includes(q)
      })
    }

    if (!isTrashView) {
      if (status !== 'الكل') {
        pool = pool.filter((quote) => quote.status === status)
      }
      if (templateFilter !== 'all') {
        pool = pool.filter((quote) => quote.templateSnapshot?.id === templateFilter)
      }
      if (folderId !== null) {
        pool = pool.filter((quote) => quote.folderId === folderId)
      } else if (!query.trim()) {
        pool = pool.filter((quote) => quote.folderId === null)
      }
    }

    return sortQuotes(pool, sortOption)
  }, [data.quotes, isTrashView, query, status, templateFilter, folderId, sortOption])

  const trashedCount = useMemo(() => data.quotes.filter((q) => Boolean(q.deletedAt)).length, [data.quotes])
  const activeQuote = data.quotes.find((quote) => quote.id === activeQuoteId) ?? null

  const createFolder = (nameArg?: string, initialQuoteIds?: string[]) => {
    const doCreate = (folderName: string) => {
      const name = folderName.trim()
      if (!name) return
      const randomColor = FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)]
      const folder: QuoteFolder = { id: makeId(), name, color: randomColor }
      commitWorkspace((current) => ({
        ...current,
        folders: [...current.folders, folder],
        quotes: initialQuoteIds && initialQuoteIds.length > 0
          ? current.quotes.map((q) => (initialQuoteIds.includes(q.id) ? { ...q, folderId: folder.id } : q))
          : current.quotes,
      }))
      setToast(
        initialQuoteIds && initialQuoteIds.length > 0
          ? `تم إنشاء مجلد «${folder.name}» ونقل ${initialQuoteIds.length} عروض إليه`
          : `تم إنشاء مجلد «${folder.name}»`,
      )
    }

    if (typeof nameArg === 'string' && nameArg.trim()) {
      doCreate(nameArg)
    } else {
      showPrompt({
        title: 'مجلد جديد',
        message: 'أدخل اسمًا للمجلد لتنظيم عروض الأسعار داخله:',
        placeholder: 'اسم المجلد...',
        confirmText: 'إنشاء المجلد',
        icon: 'folder',
        onConfirm: doCreate,
      })
    }
  }

  const renameFolder = (folder: QuoteFolder) => {
    showPrompt({
      title: 'إعادة تسمية المجلد',
      message: `تغيير اسم المجلد «${folder.name}»:`,
      defaultValue: folder.name,
      placeholder: 'اسم المجلد...',
      confirmText: 'حفظ',
      icon: 'folder',
      onConfirm: (newName) => {
        const trimmed = newName.trim()
        if (!trimmed || trimmed === folder.name) return
        commitWorkspace((current) => ({
          ...current,
          folders: current.folders.map((f) => (f.id === folder.id ? { ...f, name: trimmed } : f)),
        }))
        setToast(`تمت إعادة تسمية المجلد إلى «${trimmed}»`)
      },
    })
  }

  const changeFolderColor = (folder: QuoteFolder, color: string) => {
    commitWorkspace((current) => ({
      ...current,
      folders: current.folders.map((f) => (f.id === folder.id ? { ...f, color } : f)),
    }))
    setToast(`تم تحديث لون مجلد «${folder.name}»`)
  }

  const deleteFolder = (folder: QuoteFolder) => {
    const quotesInFolder = data.quotes.filter((q) => q.folderId === folder.id)
    const promptMsg = quotesInFolder.length > 0
      ? `سيتم إخراج ${quotesInFolder.length} عروض وإعادتها لمساحة العمل دون حذفها.`
      : 'هل تريد بالتأكيد حذف هذا المجلد؟'

    showConfirm({
      title: `حذف مجلد «${folder.name}»؟`,
      message: promptMsg,
      confirmText: 'حذف المجلد',
      isDanger: true,
      icon: 'danger',
      onConfirm: () => {
        commitWorkspace((current) => ({
          ...current,
          folders: current.folders.filter((f) => f.id !== folder.id),
          quotes: current.quotes.map((q) => (q.folderId === folder.id ? { ...q, folderId: null } : q)),
        }))
        if (folderId === folder.id) setFolderId(null)
        setToast(`تم حذف مجلد «${folder.name}»`)
      },
    })
  }

  const openQuote = (quoteId: string) => {
    setActiveQuoteId(quoteId)
    setScreen('editor')
  }

  const createFromTemplate = (templateId: string) => {
    const template = starterTemplates.find((item) => item.id === templateId) ?? starterTemplates[0]
    const nextNumber =
      Math.max(0, ...data.quotes.map((q) => Number(q.number.match(/(\d+)$/)?.[1] ?? 0))) + 1
    const nextNumberStr = `AN-${new Date().getFullYear()}-${String(nextNumber).padStart(3, '0')}`
    const quote = createQuoteFromTemplate(template, nextNumberStr, folderId)

    commitWorkspace((current) => ({ ...current, quotes: [quote, ...current.quotes] }))
    setActiveQuoteId(quote.id)
    setScreen('editor')
    setToast(`تم إنشاء «${quote.title}» من القالب`)
  }

  const updateQuote = (id: string, patch: Partial<Quote>) =>
    commitWorkspace((current) => ({
      ...current,
      quotes: current.quotes.map((quote) =>
        quote.id === id ? { ...quote, ...patch, updatedAt: new Date().toISOString().slice(0, 10) } : quote,
      ),
    }))

  const updateItem = (itemId: string, patch: Partial<Quote['items'][number]>) => {
    if (!activeQuote) return
    updateQuote(activeQuote.id, {
      items: activeQuote.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    })
  }

  const copyQuote = (quote: Quote) => {
    const nextNumber =
      Math.max(0, ...data.quotes.map((q) => Number(q.number.match(/(\d+)$/)?.[1] ?? 0))) + 1
    const copy: Quote = {
      ...quote,
      id: makeId(),
      number: `AN-${new Date().getFullYear()}-${String(nextNumber).padStart(3, '0')}`,
      title: `${quote.title} — نسخة`,
      status: 'مسودة',
      updatedAt: new Date().toISOString().slice(0, 10),
      items: quote.items.map((item) => ({ ...item, id: makeId() })),
      templateSnapshot: { ...quote.templateSnapshot },
    }
    commitWorkspace((current) => ({ ...current, quotes: [copy, ...current.quotes] }))
    setToast('تم تكرار العرض')
  }

  const softDeleteQuote = (quote: Quote) => {
    const quoteId = quote.id
    const prevTitle = quote.title
    if (deletingQuoteId) return
    setDeletingQuoteId(quoteId)

    window.setTimeout(() => {
      commitWorkspace((current) => ({
        ...current,
        quotes: current.quotes.map((q) =>
          q.id === quoteId ? { ...q, deletedAt: new Date().toISOString() } : q,
        ),
      }))
      setSelectedQuoteIds((sel) => sel.filter((id) => id !== quoteId))
      setDeletingQuoteId(null)
      setToast(`تم نقل «${prevTitle}» إلى سلة المحذوفات`)
      setToastUndoAction(() => () => {
        commitWorkspace((current) => ({
          ...current,
          quotes: current.quotes.map((q) => (q.id === quoteId ? { ...q, deletedAt: null } : q)),
        }))
        setToast(`تمت استعادة «${prevTitle}»`)
      })
    }, 1420)
  }

  const restoreQuote = (quote: Quote) => {
    commitWorkspace((current) => ({
      ...current,
      quotes: current.quotes.map((q) => (q.id === quote.id ? { ...q, deletedAt: null } : q)),
    }))
    setToast(`تمت استعادة «${quote.title}» إلى مساحة العمل`)
  }

  const permanentDeleteQuote = (quote: Quote) => {
    showConfirm({
      title: `حذف «${quote.title}» نهائيًا؟`,
      message: 'سيتم حذف هذا العرض نهائيًا من مساحة العمل ولا يمكن استعادته بعد ذلك.',
      confirmText: 'حذف نهائي',
      isDanger: true,
      icon: 'danger',
      onConfirm: () => {
        commitWorkspace((current) => ({
          ...current,
          quotes: current.quotes.filter((q) => q.id !== quote.id),
        }))
        setSelectedQuoteIds((sel) => sel.filter((id) => id !== quote.id))
        setToast('تم حذف العرض نهائيًا')
      },
    })
  }

  const emptyTrash = () => {
    if (trashedCount === 0) return
    showConfirm({
      title: 'إفراغ سلة المحذوفات؟',
      message: `هل أنت متأكد من حذف ${trashedCount} عروض نهائيًا وتفريغ سلة المحذوفات؟ لا يمكن التراجع بعد ذلك.`,
      confirmText: 'إفراغ السلة',
      cancelText: 'إلغاء',
      isDanger: true,
      icon: 'danger',
      onConfirm: () => {
        commitWorkspace((current) => ({
          ...current,
          quotes: current.quotes.filter((q) => !q.deletedAt),
        }))
        setSelectedQuoteIds([])
        setToast('تم إفراغ سلة المحذوفات')
      },
    })
  }

  const reorderQuote = (quoteId: string, direction: 'up' | 'down') => {
    commitWorkspace((current) => {
      const idx = current.quotes.findIndex((q) => q.id === quoteId)
      if (idx === -1) return current
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= current.quotes.length) return current
      const list = [...current.quotes]
      ;[list[idx], list[targetIdx]] = [list[targetIdx], list[idx]]
      return { ...current, quotes: list }
    })
  }

  const handleDropOnQuote = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return
    const source = data.quotes.find((q) => q.id === sourceId)
    const target = data.quotes.find((q) => q.id === targetId)
    if (!source || !target) return

    setDragTargetId(null)
    setDragTargetType(null)
    setDragQuoteId(null)

    if (target.folderId) {
      handleDropOnFolder(sourceId, target.folderId)
      return
    }

    // Auto-generate name without prompt so animation is uninterrupted
    const baseName = 'مجلد جديد'
    let folderName = baseName
    let counter = 2
    while (data.folders.some((f) => f.name === folderName)) {
      folderName = `${baseName} ${counter++}`
    }

    const randomColor = FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)]
    const newFolder: QuoteFolder = {
      id: makeId(),
      name: folderName,
      color: randomColor,
    }

    // Trigger the creative folder containment animation
    setMergingQuotes({
      sourceId,
      targetId,
      sourceQuote: source,
      targetQuote: target,
      newFolderId: newFolder.id,
      newFolderName: folderName,
      newFolderColor: randomColor,
    })

    window.setTimeout(() => {
      setFlyingFolderId(newFolder.id)
      commitWorkspace((current) => ({
        ...current,
        folders: [...current.folders, newFolder],
        quotes: current.quotes.map((q) =>
          q.id === sourceId || q.id === targetId ? { ...q, folderId: newFolder.id } : q,
        ),
      }))
      setMergingQuotes(null)
      setToast(`تم إنشاء «${folderName}» وضم العرضين داخله`)

      if (tutorialActive && tutorialStep === 2) {
        setToast('📁 مذهل! تشكل مجلد جديد تلقائياً بحركة الابتلاع واحتوى العرضين!')
        window.setTimeout(() => {
          setTutorialStep(3)
        }, 1600)
      }

      window.setTimeout(() => {
        setFlyingFolderId(null)
      }, 750)
    }, 920)
  }

  const handleDropOnFolder = (sourceId: string, targetFolderId: string) => {
    const folder = data.folders.find((f) => f.id === targetFolderId)
    const quote = data.quotes.find((q) => q.id === sourceId)
    if (!folder || !quote) return

    setDragTargetId(null)
    setDragTargetType(null)
    setDragQuoteId(null)

    // Trigger the creative Apple-style folder absorption animation
    setAbsorbingDrop({
      quoteId: sourceId,
      folderId: targetFolderId,
      quoteTitle: quote.title,
      quoteNumber: quote.number,
      quoteAccent: quote.accent,
    })

    window.setTimeout(() => {
      updateQuote(sourceId, { folderId: targetFolderId })
      setToast(`نُقل «${quote.title || quote.number}» إلى «${folder.name}»`)
      setAbsorbingDrop(null)

      if (tutorialActive && tutorialStep === 4) {
        setToast('🎉 أحسنت! ابتلع المجلد الورقة وزاد عداده (+1)!')
        window.setTimeout(() => {
          setTutorialStep(5)
        }, 1400)
      }
    }, 920)
  }

  const handleDragHoverTarget = (id: string, type: 'folder' | 'quote') => {
    setDragTargetType(type)
    setDragTargetId(id)
  }

  const handleDragLeaveTarget = (id: string) => {
    setDragTargetId((currentId) => {
      if (currentId === id) {
        setDragTargetType(null)
        return null
      }
      return currentId
    })
  }

  // Multi-selection operations
  const toggleSelectQuote = (id: string) => {
    setSelectedQuoteIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    )
  }

  const toggleSelectAll = () => {
    const visibleIds = visibleQuotes.map((q) => q.id)
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedQuoteIds.includes(id))
    if (allSelected) {
      setSelectedQuoteIds((current) => current.filter((id) => !visibleIds.includes(id)))
    } else {
      setSelectedQuoteIds((current) => Array.from(new Set([...current, ...visibleIds])))
    }
  }

  const bulkMoveToFolder = (targetFolderId: string | null) => {
    if (selectedQuoteIds.length === 0) return
    const movingCount = selectedQuoteIds.length
    const folder = targetFolderId ? data.folders.find((f) => f.id === targetFolderId) : null
    const folderName = folder ? folder.name : 'مساحة العمل'
    const sampleQuote = data.quotes.find((q) => selectedQuoteIds.includes(q.id))

    // تصفير أي حالة استهداف أو تحويم سابقة
    setDragTargetId(null)
    setDragTargetType(null)
    setDragQuoteId(null)

    // إذا كان النقل لمجلد محدد، نشغل أنيميشن امتصاص المجلد للحزمة مع إبراز العدد الفعلي
    if (targetFolderId && sampleQuote) {
      setAbsorbingDrop({
        quoteId: sampleQuote.id,
        folderId: targetFolderId,
        quoteTitle: movingCount > 1 ? `${movingCount} عروض أسعار` : sampleQuote.title,
        quoteNumber: movingCount > 1 ? `+${movingCount}` : sampleQuote.number,
        quoteAccent: sampleQuote.accent,
      })

      window.setTimeout(() => {
        commitWorkspace((current) => ({
          ...current,
          quotes: current.quotes.map((q) =>
            selectedQuoteIds.includes(q.id) ? { ...q, folderId: targetFolderId } : q,
          ),
        }))
        setToast(`تم نقل ${movingCount} عروض إلى «${folderName}»`)
        setSelectedQuoteIds([])
        setAbsorbingDrop(null)
        if (tutorialActive && tutorialStep === 3) {
          setToast('🎯 رائع! نقلت العروض دفعة واحدة عبر القوس الشعاعي!')
          window.setTimeout(() => setTutorialStep(4), 1400)
        }
      }, 920)
    } else {
      commitWorkspace((current) => ({
        ...current,
        quotes: current.quotes.map((q) =>
          selectedQuoteIds.includes(q.id) ? { ...q, folderId: targetFolderId } : q,
        ),
      }))
      setToast(`تم إخراج ${movingCount} عروض إلى «${folderName}»`)
      setSelectedQuoteIds([])
    }
    setBulkFolderSelectOpen(false)
  }

  const bulkChangeStatus = (newStatus: QuoteStatus) => {
    if (selectedQuoteIds.length === 0) return
    commitWorkspace((current) => ({
      ...current,
      quotes: current.quotes.map((q) =>
        selectedQuoteIds.includes(q.id) ? { ...q, status: newStatus } : q,
      ),
    }))
    setToast(`تم تغيير حالة ${selectedQuoteIds.length} عروض إلى «${newStatus}»`)
    setSelectedQuoteIds([])
  }

  const bulkTrash = () => {
    if (selectedQuoteIds.length === 0) return
    const idsToTrash = [...selectedQuoteIds]
    commitWorkspace((current) => ({
      ...current,
      quotes: current.quotes.map((q) =>
        idsToTrash.includes(q.id) ? { ...q, deletedAt: new Date().toISOString() } : q,
      ),
    }))
    setSelectedQuoteIds([])
    setToast(`تم نقل ${idsToTrash.length} عروض إلى سلة المحذوفات`)
    setToastUndoAction(() => () => {
      commitWorkspace((current) => ({
        ...current,
        quotes: current.quotes.map((q) => (idsToTrash.includes(q.id) ? { ...q, deletedAt: null } : q)),
      }))
      setToast(`تمت استعادة ${idsToTrash.length} عروض`)
    })
  }

  const bulkRestore = () => {
    if (selectedQuoteIds.length === 0) return
    const idsToRestore = [...selectedQuoteIds]
    commitWorkspace((current) => ({
      ...current,
      quotes: current.quotes.map((q) =>
        idsToRestore.includes(q.id) ? { ...q, deletedAt: null } : q,
      ),
    }))
    setSelectedQuoteIds([])
    setToast(`تمت استعادة ${idsToRestore.length} عروض`)
  }

  const bulkPermanentDelete = () => {
    if (selectedQuoteIds.length === 0) return
    const count = selectedQuoteIds.length
    showConfirm({
      title: `حذف ${count} عروض نهائيًا؟`,
      message: 'سيتم حذف جميع العروض المحددة نهائيًا ولن يمكن التراجع بعد ذلك.',
      confirmText: 'حذف نهائي',
      isDanger: true,
      icon: 'danger',
      onConfirm: () => {
        const idsToDelete = [...selectedQuoteIds]
        commitWorkspace((current) => ({
          ...current,
          quotes: current.quotes.filter((q) => !idsToDelete.includes(q.id)),
        }))
        setSelectedQuoteIds([])
        setToast(`تم حذف ${idsToDelete.length} عروض نهائيًا`)
      },
    })
  }

  const bulkCopyQuotes = () => {
    if (selectedQuoteIds.length === 0) return
    const quotesToCopy = data.quotes.filter((q) => selectedQuoteIds.includes(q.id))
    let nextNum =
      Math.max(0, ...data.quotes.map((q) => Number(q.number.match(/(\d+)$/)?.[1] ?? 0))) + 1
    const copies: Quote[] = quotesToCopy.map((quote) => {
      const num = nextNum++
      return {
        ...quote,
        id: makeId(),
        number: `AN-${new Date().getFullYear()}-${String(num).padStart(3, '0')}`,
        title: `${quote.title} — نسخة`,
        status: 'مسودة',
        updatedAt: new Date().toISOString().slice(0, 10),
        items: quote.items.map((item) => ({ ...item, id: makeId() })),
        templateSnapshot: { ...quote.templateSnapshot },
      }
    })
    commitWorkspace((current) => ({
      ...current,
      quotes: [...copies, ...current.quotes],
    }))
    setToast(`تم إنشاء نسخ من ${quotesToCopy.length} عروض`)
    setSelectedQuoteIds([])
    if (tutorialActive && tutorialStep === 3) {
      setToast('🎯 رائع! نسخت العروض دفعة واحدة عبر القوس الشعاعي!')
      window.setTimeout(() => setTutorialStep(4), 1400)
    }
  }

  // Storage Handlers
  const handleChooseFolder = async (initializeEmpty = false) => {
    try {
      const link = await chooseWorkspaceFolder(
        initializeEmpty ? { initializeWith: createEmptyWorkspace() } : undefined,
      )
      hasPendingFolderSyncRef.current = false
      revisionRef.current += 1
      dataRef.current = link.data
      setData(link.data)
      setFolderId(null)
      setWorkspaceName(link.name)
      setWorkspaceMode('folder')
      setSaveState('saved')
      setSaveErrorMessage(null)
      setFolderFileCount(link.fileCount)
      setLastSavedAt(link.data.updatedAt)
      setWorkspaceMenuOpen(false)
      setToast(
        initializeEmpty
          ? `أُنشئت مساحة عمل جديدة في مجلد «${link.name}»`
          : link.indexRebuilt
            ? `تم ربط «${link.name}» وإعادة بناء الفهرس من الملفات`
            : `تم ربط مجلد «${link.name}»`,
      )
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setToast(error instanceof Error ? error.message : 'تعذر ربط المجلد')
    }
  }

  const handleReconnectFolder = async () => {
    try {
      const pendingData =
        hasPendingFolderSyncRef.current ||
        saveState === 'pending-reconnect' ||
        saveState === 'write-error'
          ? dataRef.current
          : null
      const reconnected = await reconnectWorkspace(true, pendingData)
      const link = reconnected ?? (await chooseWorkspaceFolder(pendingData ? { initializeWith: pendingData } : undefined))
      hasPendingFolderSyncRef.current = false
      revisionRef.current += 1
      dataRef.current = link.data
      setData(link.data)
      setWorkspaceName(link.name)
      setWorkspaceMode('folder')
      setSaveState('saved')
      setSaveErrorMessage(null)
      setFolderFileCount(link.fileCount)
      setLastSavedAt(link.data.updatedAt)
      setWorkspaceMenuOpen(false)
      setToast(
        pendingData
          ? `تمت إعادة ربط «${link.name}» وحفظ التعديلات المعلقة`
          : `تمت استعادة الربط مع مجلد «${link.name}»`,
      )
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setSaveState('write-error')
      const rawMessage = error instanceof Error ? error.message : 'تعذر إعادة ربط المجلد'
      const message = `تعذر تحديث ملفات المجلد (${rawMessage}). لم تُفقد تعديلاتك وهي محفوظة مؤقتًا.`
      setSaveErrorMessage(message)
      setToast(message)
    }
  }

  const handleRetrySave = async () => {
    if (workspaceMode === 'reconnect') {
      await handleReconnectFolder()
      return
    }
    setSaveState('saving')
    const result = await persistWorkspaceToFolder(dataRef.current)
    if (result.ok) {
      hasPendingFolderSyncRef.current = false
      setSaveState('saved')
      setSaveErrorMessage(null)
      setLastSavedAt(result.savedAt ?? new Date().toISOString())
      if (typeof result.fileCount === 'number') setFolderFileCount(result.fileCount)
      setToast('تم حفظ جميع التغييرات في المجلد')
    } else if (result.reason === 'permission-lost') {
      setWorkspaceMode('reconnect')
      setSaveState('pending-reconnect')
      setSaveErrorMessage(result.message ?? 'انقطع إذن المجلد')
      setToast('يلزم إعادة منح إذن المجلد للحفظ')
    } else {
      setSaveState('write-error')
      setSaveErrorMessage(result.message ?? 'تعذر الحفظ في المجلد')
      setToast(result.message ?? 'تعذر الحفظ في المجلد')
    }
  }

  const handleRebuildIndex = async () => {
    try {
      const link = await rebuildLinkedWorkspaceIndex()
      hasPendingFolderSyncRef.current = false
      revisionRef.current += 1
      dataRef.current = link.data
      setData(link.data)
      setFolderFileCount(link.fileCount)
      setSaveState('saved')
      setSaveErrorMessage(null)
      setLastSavedAt(link.data.updatedAt)
      setWorkspaceMenuOpen(false)
      setToast(`تم فحص المجلد وإعادة بناء الفهرس (${link.data.quotes.length} عروض)`)
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'تعذر إعادة بناء الفهرس')
    }
  }

  const handleSwitchToMemoryDemo = async () => {
    await clearSavedHandle()
    hasPendingFolderSyncRef.current = false
    revisionRef.current += 1
    const demo = cloneDemoWorkspace()
    dataRef.current = demo
    setData(demo)
    setFolderId(null)
    setWorkspaceMode('memory')
    setWorkspaceName('مساحة تجريبية في الذاكرة')
    setSaveState('saved')
    setSaveErrorMessage(null)
    setFolderFileCount(0)
    setWorkspaceMenuOpen(false)
    setToast('تم التبديل إلى المساحة التجريبية في الذاكرة')
  }

  const handleExportJson = () => {
    const json = exportWorkspaceJsonString(dataRef.current)
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'anfas-workspace.json'
    anchor.click()
    URL.revokeObjectURL(url)
    setWorkspaceMenuOpen(false)
    setToast('تم تنزيل ملف مساحة العمل anfas-workspace.json')
  }

  const handleImportJsonFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const imported = parseImportedWorkspaceJson(text)
      commitWorkspace(imported)
      setFolderId(null)
      setWorkspaceMenuOpen(false)
      setToast(`تم استيراد ${imported.quotes.length} عروض و${imported.folders.length} مجلدات`)
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'تعذر استيراد ملف البيانات')
    }
  }

  const connectionStatusText =
    workspaceMode === 'folder'
      ? saveState === 'saving'
        ? 'جارٍ الحفظ…'
        : saveState === 'saved'
          ? `محفوظ (${folderFileCount || data.quotes.length + data.folders.length + 1})`
          : 'تعذر الحفظ'
      : workspaceMode === 'reconnect'
        ? 'يلزم إعادة الربط'
        : workspaceMode === 'memory'
          ? 'في الذاكرة'
          : supportsDirectoryPicker()
            ? 'غير مربوط'
            : 'غير مدعوم'

  const editorSaveLabel =
    saveState === 'saving'
      ? 'جارٍ الحفظ…'
      : saveState === 'pending-reconnect'
        ? 'بانتظار إعادة ربط المجلد'
        : saveState === 'write-error'
          ? 'حُفظت مؤقتًا (تعذر تحديث المجلد)'
          : workspaceMode === 'folder'
            ? 'محفوظ في المجلد'
            : workspaceMode === 'memory'
              ? 'محفوظ في الذاكرة المؤقتة'
              : 'محفوظ مؤقتًا في المتصفح'

  const quoteCalc = activeQuote ? calculateQuote(activeQuote) : null
  const paginatedDoc = useMemo(
    () => (activeQuote ? paginateQuoteDocument(activeQuote) : null),
    [activeQuote],
  )
  const [previewZoom, setPreviewZoom] = useState<number>(100)
  const [currentPreviewPage, setCurrentPreviewPage] = useState<number>(1)
  const [isFullPreview, setIsFullPreview] = useState<boolean>(false)
  const a4StageRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setCurrentPreviewPage(1)
  }, [activeQuoteId])

  useEffect(() => {
    if (paginatedDoc && currentPreviewPage > paginatedDoc.totalPages) {
      setCurrentPreviewPage(paginatedDoc.totalPages)
    }
  }, [paginatedDoc, currentPreviewPage])

  const scrollToPreviewPage = (targetPage: number) => {
    if (!paginatedDoc) return
    const clamped = Math.max(1, Math.min(paginatedDoc.totalPages, targetPage))
    setCurrentPreviewPage(clamped)
    const stage = a4StageRef.current
    if (!stage) return
    const sheet = stage.querySelector<HTMLElement>(`[data-page-number="${clamped}"]`)
    if (sheet) {
      sheet.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handlePrintPdf = () => {
    if (!activeQuote) return
    setToast('جارٍ تجهيز وثيقة A4 للطباعة أو الحفظ كملف PDF...')
    window.setTimeout(() => {
      window.print()
    }, 120)
  }

  const handleDownloadPrintableDocument = () => {
    if (!activeQuote) return
    const html = exportPrintableQuoteHtml(activeQuote)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${activeQuote.number || 'quote'}-A4.html`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setToast(`تم تنزيل وثيقة العرض القابلة للطباعة (${activeQuote.number}-A4.html)`)
  }

  const updatePageSettings = (patch: Partial<ReturnType<typeof resolvePageSettings>>) => {
    if (!activeQuote) return
    const currentSettings = resolvePageSettings(activeQuote)
    updateQuote(activeQuote.id, {
      pageSettings: {
        ...currentSettings,
        ...patch,
      },
    })
  }

  const handleWarningAction = (warning: QuoteDocumentWarning) => {
    if (!activeQuote || !quoteCalc) return
    switch (warning.actionType) {
      case 'set-compact-margins':
        updatePageSettings({ marginPreset: 'compact' })
        setToast('تم تفعيل الهوامش المضغوطة لضم المحتوى وتقليل عدد الصفحات')
        break
      case 'balance-milestones':
        if (activeQuote.paymentSchedule && activeQuote.paymentSchedule.length > 0) {
          const count = activeQuote.paymentSchedule.length
          const basePerc = Math.floor(100 / count)
          const normalized = activeQuote.paymentSchedule.map((m, idx) => ({
            ...m,
            percentage: idx === count - 1 ? 100 - basePerc * (count - 1) : basePerc,
          }))
          updateQuote(activeQuote.id, {
            paymentSchedule: balancePaymentMilestones(quoteCalc.total, normalized),
          })
          setToast('تمت موازنة نسب ومبالغ الدفعات تلقائيًا مع الإجمالي النهائي')
        }
        break
      case 'go-client':
        setIsFullPreview(false)
        setSelectedSection('العميل والمشروع')
        break
      case 'go-items':
        setIsFullPreview(false)
        setSelectedSection('البنود والأسعار')
        break
      default:
        if (warning.targetSection) {
          setIsFullPreview(false)
          setSelectedSection(warning.targetSection)
        }
        break
    }
  }

  const currentFolder = data.folders.find((f) => f.id === folderId) ?? null

  const isAllVisibleSelected =
    visibleQuotes.length > 0 && visibleQuotes.every((q) => selectedQuoteIds.includes(q.id))

  const showGlobalBar = screen === 'library'

  return (
    <div className="workbench">
      {showGlobalBar && (
        <GlobalBar
          folderId={folderId}
          isTrashView={isTrashView}
          trashedCount={trashedCount}
          query={query}
          screen={screen}
          workspaceMode={workspaceMode}
          saveState={saveState}
          workspaceMenuOpen={workspaceMenuOpen}
          workspaceName={workspaceName}
          saveErrorMessage={saveErrorMessage}
          connectionStatusText={connectionStatusText}
          lastSavedAt={lastSavedAt}
          workspaceId={data.workspaceId}
          searchInputRef={searchInputRef}
          fileInputRef={fileInputRef}
          setScreen={setScreen}
          setIsTrashView={setIsTrashView}
          setFolderId={setFolderId}
          setQuery={setQuery}
          setWorkspaceMenuOpen={setWorkspaceMenuOpen}
          createFolder={createFolder}
          emptyTrash={emptyTrash}
          handleRetrySave={handleRetrySave}
          handleExportJson={handleExportJson}
          handleReconnectFolder={handleReconnectFolder}
          handleChooseFolder={handleChooseFolder}
          handleRebuildIndex={handleRebuildIndex}
          handleImportJsonFile={handleImportJsonFile}
          handleSwitchToMemoryDemo={handleSwitchToMemoryDemo}
          onOpenGestureTips={startGamifiedTutorial}
        />
      )}

      {screen === 'library' && (
        <LibraryScreen
          data={data}
          folderId={folderId}
          currentFolder={currentFolder}
          isTrashView={isTrashView}
          trashedCount={trashedCount}
          visibleQuotes={visibleQuotes}
          query={query}
          status={status}
          templateFilter={templateFilter}
          sortOption={sortOption}
          gridSize={gridSize}
          selectedQuoteIds={selectedQuoteIds}
          isAllVisibleSelected={isAllVisibleSelected}
          bulkFolderSelectOpen={bulkFolderSelectOpen}
          activeMenuId={activeMenuId}
          dragQuoteId={dragQuoteId}
          dragTargetId={dragTargetId}
          dragTargetType={dragTargetType}
          absorbingDrop={absorbingDrop}
          mergingQuotes={mergingQuotes}
          deletingQuoteId={deletingQuoteId}
          flyingFolderId={flyingFolderId}
          workspaceMode={workspaceMode}
          workspaceName={workspaceName}
          setFolderId={setFolderId}
          setIsTrashView={setIsTrashView}
          setScreen={setScreen}
          setStatus={setStatus}
          setTemplateFilter={setTemplateFilter}
          setSortOption={setSortOption}
          setSelectedQuoteIds={setSelectedQuoteIds}
          setBulkFolderSelectOpen={setBulkFolderSelectOpen}
          setActiveMenuId={setActiveMenuId}
          setDragQuoteId={setDragQuoteId}
          setDragTargetId={setDragTargetId}
          setDragTargetType={setDragTargetType}
          setToast={setToast}
          handleSetGridSize={handleSetGridSize}
          emptyTrash={emptyTrash}
          toggleSelectAll={toggleSelectAll}
          bulkMoveToFolder={bulkMoveToFolder}
          bulkChangeStatus={bulkChangeStatus}
          bulkTrash={bulkTrash}
          bulkRestore={bulkRestore}
          bulkPermanentDelete={bulkPermanentDelete}
          bulkCopyQuotes={bulkCopyQuotes}
          showPrompt={showPrompt}
          createFolder={createFolder}
          renameFolder={renameFolder}
          changeFolderColor={changeFolderColor}
          deleteFolder={deleteFolder}
          handleDragHoverTarget={handleDragHoverTarget}
          handleDragLeaveTarget={handleDragLeaveTarget}
          handleDropOnFolder={handleDropOnFolder}
          handleDropOnQuote={handleDropOnQuote}
          openQuote={openQuote}
          toggleSelectQuote={toggleSelectQuote}
          updateQuote={updateQuote}
          copyQuote={copyQuote}
          softDeleteQuote={softDeleteQuote}
          permanentDeleteQuote={permanentDeleteQuote}
          restoreQuote={restoreQuote}
          reorderQuote={reorderQuote}
        />
      )}

      {screen === 'templates' && (
        <TemplatePickerScreen
          activeTemplateId={activeTemplateId}
          setActiveTemplateId={setActiveTemplateId}
          onBackToLibrary={() => setScreen('library')}
          onOpenDesigner={() => setScreen('template-designer')}
          onCreateFromTemplate={createFromTemplate}
        />
      )}

      {screen === 'editor' && activeQuote && quoteCalc && paginatedDoc && (
        <QuoteEditorScreen
          activeQuote={activeQuote}
          quoteCalc={quoteCalc}
          paginatedDoc={paginatedDoc}
          isFullPreview={isFullPreview}
          saveState={saveState}
          editorSaveLabel={editorSaveLabel}
          selectedSection={selectedSection}
          previewZoom={previewZoom}
          currentPreviewPage={currentPreviewPage}
          a4StageRef={a4StageRef}
          setIsFullPreview={setIsFullPreview}
          setScreen={setScreen}
          setSelectedSection={setSelectedSection}
          setPreviewZoom={setPreviewZoom}
          setToast={setToast}
          handleRetrySave={handleRetrySave}
          handleDownloadPrintableDocument={handleDownloadPrintableDocument}
          handlePrintPdf={handlePrintPdf}
          updateQuote={updateQuote}
          updateItem={updateItem}
          updatePageSettings={updatePageSettings}
          handleWarningAction={handleWarningAction}
          scrollToPreviewPage={scrollToPreviewPage}
          makeId={makeId}
        />
      )}

      {screen === 'template-designer' && (
        <TemplateDesignerScreen
          activeTemplateId={activeTemplateId}
          designerSection={designerSection}
          setDesignerSection={setDesignerSection}
          onBackToTemplates={() => setScreen('templates')}
          onShowToast={setToast}
          onSaveTemplate={() => {
            setScreen('templates')
            setToast('تم حفظ إعداد القالب التجريبي')
          }}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          <span>{toast}</span>
          {toastUndoAction && (
            <button
              className="toast-undo-action"
              onClick={() => {
                toastUndoAction()
                setToastUndoAction(null)
              }}
            >
              <RotateCcw size={13} />
              تراجع
            </button>
          )}
          <button
            aria-label="إغلاق الرسالة"
            onClick={() => {
              setToast('')
              setToastUndoAction(null)
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {activeDialog && (
        <AppleModalDialog
          dialog={activeDialog}
          onClose={() => setActiveDialog(null)}
        />
      )}

      {/* Game-like Live Quest Tutorial Overlay */}
      <GameTutorialQuest
        isActive={tutorialActive}
        activeStep={tutorialStep}
        onClose={() => setTutorialActive(false)}
        onNextStep={() => setTutorialStep((s) => Math.min(s + 1, 5))}
        onPrevStep={() => setTutorialStep((s) => Math.max(s - 1, 1))}
        onSetStep={(st) => setTutorialStep(st)}
        quotes={data.quotes}
        folders={data.folders}
      />

      {/* Interactive Gestures & Animations Guide Modal */}
      <InteractiveTipsModal
        isOpen={gestureTipsOpen}
        onClose={() => setGestureTipsOpen(false)}
      />
    </div>
  )
}
