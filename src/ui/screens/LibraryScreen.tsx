import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FilePlus2,
  FileText,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  SORT_OPTIONS,
  starterTemplates,
  type Quote,
  type QuoteFolder,
  type QuoteStatus,
  type SortOption,
  type WorkspaceData,
} from '../../domain/quote'
import { FolderCard } from '../components/FolderCard'
import { QuoteTile } from '../components/QuoteTile'
import { SelectionDocumentHub } from '../components/SelectionDocumentHub'
import { statuses, type DialogConfig, type Screen, type WorkspaceMode } from '../types'

export interface LibraryScreenProps {
  data: WorkspaceData
  folderId: string | null
  currentFolder: QuoteFolder | null
  isTrashView: boolean
  trashedCount: number
  visibleQuotes: Quote[]
  query: string
  status: 'الكل' | QuoteStatus
  templateFilter: string
  sortOption: SortOption
  gridSize: 'compact' | 'small' | 'medium' | 'large'
  selectedQuoteIds: string[]
  isAllVisibleSelected?: boolean
  bulkFolderSelectOpen?: boolean
  activeMenuId: string | null
  dragQuoteId: string | null
  dragTargetId: string | null
  dragTargetType: 'quote' | 'folder' | null
  absorbingDrop: {
    quoteId: string
    folderId: string
    quoteTitle: string
    quoteNumber: string
    quoteAccent: string
  } | null
  mergingQuotes: {
    sourceId: string
    targetId: string
    sourceQuote: Quote
    targetQuote: Quote
    newFolderId: string
    newFolderName: string
    newFolderColor: string
  } | null
  deletingQuoteId?: string | null
  flyingFolderId?: string | null
  workspaceMode: WorkspaceMode
  workspaceName: string
  setFolderId: (id: string | null) => void
  setIsTrashView: (fn: boolean | ((prev: boolean) => boolean)) => void
  setScreen: (screen: Screen) => void
  setStatus: (status: 'الكل' | QuoteStatus) => void
  setTemplateFilter: (val: string) => void
  setSortOption: (opt: SortOption) => void
  setSelectedQuoteIds: (ids: string[]) => void
  setBulkFolderSelectOpen?: (fn: boolean | ((v: boolean) => boolean)) => void
  setActiveMenuId: (fn: string | null | ((curr: string | null) => string | null)) => void
  setDragQuoteId: (id: string | null) => void
  setDragTargetId: (id: string | null) => void
  setDragTargetType: (type: 'quote' | 'folder' | null) => void
  setToast: (msg: string) => void
  handleSetGridSize: (size: 'compact' | 'small' | 'medium' | 'large') => void
  emptyTrash: () => void
  toggleSelectAll?: () => void
  bulkMoveToFolder: (folderId: string | null) => void
  bulkChangeStatus: (status: QuoteStatus) => void
  bulkTrash: () => void
  bulkRestore: () => void
  bulkPermanentDelete: () => void
  bulkCopyQuotes: () => void
  showPrompt: (config: Omit<DialogConfig & { type: 'prompt' }, 'type'>) => void
  createFolder: (name?: string, quoteIds?: string[]) => void
  renameFolder: (folder: QuoteFolder) => void
  changeFolderColor: (folder: QuoteFolder, color: string) => void
  deleteFolder: (folder: QuoteFolder) => void
  handleDragHoverTarget: (id: string, type: 'quote' | 'folder') => void
  handleDragLeaveTarget: (id: string) => void
  handleDropOnFolder: (sourceId: string, folderId: string) => void
  handleDropOnQuote: (sourceId: string, targetId: string) => void
  openQuote: (quoteId: string) => void
  toggleSelectQuote: (quoteId: string) => void
  updateQuote: (quoteId: string, patch: Partial<Quote>) => void
  copyQuote: (quote: Quote) => void
  softDeleteQuote: (quote: Quote) => void
  permanentDeleteQuote: (quote: Quote) => void
  restoreQuote: (quote: Quote) => void
  reorderQuote: (quoteId: string, dir: 'up' | 'down') => void
}

export function LibraryScreen({
  data,
  folderId,
  currentFolder,
  isTrashView,
  trashedCount,
  visibleQuotes,
  query,
  status,
  templateFilter,
  sortOption,
  gridSize,
  selectedQuoteIds,
  isAllVisibleSelected: _isAllVisibleSelected,
  bulkFolderSelectOpen: _bulkFolderSelectOpen,
  activeMenuId,
  dragQuoteId,
  dragTargetId,
  dragTargetType,
  absorbingDrop,
  mergingQuotes,
  deletingQuoteId,
  flyingFolderId,
  workspaceMode,
  workspaceName,
  setFolderId,
  setIsTrashView,
  setScreen,
  setStatus,
  setTemplateFilter,
  setSortOption,
  setSelectedQuoteIds,
  setBulkFolderSelectOpen: _setBulkFolderSelectOpen,
  setActiveMenuId,
  setDragQuoteId,
  setDragTargetId,
  setDragTargetType,
  setToast,
  handleSetGridSize,
  emptyTrash,
  toggleSelectAll: _toggleSelectAll,
  bulkMoveToFolder,
  bulkChangeStatus,
  bulkTrash,
  bulkRestore,
  bulkPermanentDelete,
  bulkCopyQuotes,
  showPrompt,
  createFolder,
  renameFolder,
  changeFolderColor,
  deleteFolder,
  handleDragHoverTarget,
  handleDragLeaveTarget,
  handleDropOnFolder,
  handleDropOnQuote,
  openQuote,
  toggleSelectQuote,
  updateQuote,
  copyQuote,
  softDeleteQuote,
  permanentDeleteQuote,
  restoreQuote,
  reorderQuote,
}: LibraryScreenProps) {
  const gridContainerRef = useRef<HTMLDivElement>(null)
  const prevRectsRef = useRef<Map<string, DOMRect>>(new Map())
  const launchingFolderRef = useRef<{ id: string; rect: DOMRect } | null>(null)

  // Record launching point of merged folder while mergingQuotes is still active
  useLayoutEffect(() => {
    if (mergingQuotes && gridContainerRef.current) {
      const targetEl = gridContainerRef.current.querySelector<HTMLElement>(
        `[data-flip-id="quote-${mergingQuotes.targetId}"]`,
      )
      if (targetEl) {
        launchingFolderRef.current = {
          id: `folder-${mergingQuotes.newFolderId}`,
          rect: targetEl.getBoundingClientRect(),
        }
      }
    }
  }, [mergingQuotes])

  // Track layout identity: items list & view keys to trigger FLIP only when content layout genuinely changes
  const layoutIdentityKey = useMemo(() => {
    return [
      visibleQuotes.map((q) => q.id).join(','),
      data.folders.map((f) => f.id).join(','),
      isTrashView ? 'trash' : 'workspace',
      folderId ?? 'root',
      gridSize,
    ].join('::')
  }, [visibleQuotes, data.folders, isTrashView, folderId, gridSize])

  // Fluid Apple-style FLIP grid reflow animation when items are deleted, moved, or reordered
  // NOTE: Strictly gated so it never runs during active dragging (dragQuoteId !== null),
  // preventing compounding transforms and sudden card displacements.
  useLayoutEffect(() => {
    const container = gridContainerRef.current
    if (!container) return

    // Never calculate or apply FLIP transforms while user is actively dragging cards
    if (dragQuoteId !== null) {
      return
    }

    const children = Array.from(
      container.querySelectorAll<HTMLElement>('[data-flip-id]'),
    )
    const prevRects = prevRectsRef.current
    const currentRects = new Map<string, DOMRect>()

    for (const el of children) {
      const id = el.dataset.flipId
      if (id) {
        currentRects.set(id, el.getBoundingClientRect())
      }
    }

    for (const el of children) {
      const id = el.dataset.flipId
      if (!id) continue
      if (
        el.classList.contains('dragging') ||
        el.classList.contains('is-crumpling-delete') ||
        el.classList.contains('absorbing-source')
      ) {
        continue
      }

      let prev = prevRects.get(id)
      if (!prev && launchingFolderRef.current && launchingFolderRef.current.id === id) {
        prev = launchingFolderRef.current.rect
        launchingFolderRef.current = null
      }

      const curr = currentRects.get(id)
      if (prev && curr) {
        const dx = prev.left - curr.left
        const dy = prev.top - curr.top
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          const isFlyingFolder = el.classList.contains('is-flying-to-shelf') || id === `folder-${flyingFolderId}`
          el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`
          el.style.transition = 'none'

          requestAnimationFrame(() => {
            const timing = isFlyingFolder
              ? 'transform 0.68s cubic-bezier(0.16, 1, 0.3, 1)'
              : 'transform 0.44s cubic-bezier(0.2, 0.9, 0.3, 1)'
            el.style.transition = timing
            el.style.transform = 'translate3d(0, 0, 0)'
          })

          const cleanup = () => {
            el.style.transition = ''
            el.style.transform = ''
            el.removeEventListener('transitionend', cleanup)
          }
          el.addEventListener('transitionend', cleanup)
        }
      }
    }

    prevRectsRef.current = currentRects
  }, [layoutIdentityKey, deletingQuoteId, flyingFolderId, dragQuoteId])

  useEffect(() => {
    const handleResize = () => {
      if (!gridContainerRef.current) return
      const currentRects = new Map<string, DOMRect>()
      const children = Array.from(
        gridContainerRef.current.querySelectorAll<HTMLElement>('[data-flip-id]'),
      )
      for (const el of children) {
        const id = el.dataset.flipId
        if (id) currentRects.set(id, el.getBoundingClientRect())
      }
      prevRectsRef.current = currentRects
    }
    window.addEventListener('resize', handleResize, { passive: true })
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleAddQuoteToSelection = (quoteId: string) => {
    const quote = data.quotes.find((q) => q.id === quoteId)
    if (!quote) return
    if (selectedQuoteIds.includes(quoteId)) {
      setToast(`«${quote.title || quote.number}» موجود بالفعل في مستند التحديد`)
      return
    }
    const nextIds = [...selectedQuoteIds, quoteId]
    setSelectedQuoteIds(nextIds)
    setToast(`أُضيف «${quote.title || quote.number}» إلى مستند التحديد (${nextIds.length})`)
  }

  const handleRemoveQuoteFromSelection = (quoteId: string) => {
    const quote = data.quotes.find((q) => q.id === quoteId)
    setSelectedQuoteIds(selectedQuoteIds.filter((id) => id !== quoteId))
    if (quote) {
      setToast(`تمت إزالة «${quote.title || quote.number}» من مستند التحديد`)
    }
  }

  return (
    <main className={`library-screen ${folderId ? 'inside-folder' : ''}`}>
      <div className="library-header-compact">
        <div className="library-header-main">
          <div className="library-title-group">
            <div className="breadcrumb">
              <button
                className="breadcrumb-link"
                onClick={() => {
                  setFolderId(null)
                  setIsTrashView(false)
                }}
                disabled={folderId === null && !isTrashView}
              >
                مساحة العمل
              </button>
              {isTrashView ? (
                <>
                  <ChevronLeft size={13} />
                  <b>سلة المحذوفات</b>
                </>
              ) : folderId ? (
                <>
                  <ChevronLeft size={13} />
                  <b>{currentFolder?.name ?? 'المجلد'}</b>
                </>
              ) : (
                <>
                  <ChevronLeft size={13} />
                  <b>كل العروض</b>
                </>
              )}
            </div>

            <div className="title-and-badges">
              {/* Quick Back & New Buttons placed on the RIGHT for rapid access */}
              {folderId && (
                <div className="folder-right-actions">
                  <button
                    className="button outline-button folder-back-btn"
                    onClick={() => setFolderId(null)}
                    title="الرجوع لكل العروض"
                  >
                    <ChevronRight size={15} />
                    <span>رجوع</span>
                  </button>
                  <button
                    className="button primary-button folder-new-quote-btn"
                    onClick={() => setScreen('templates')}
                    title="إنشاء عرض جديد داخل هذا المجلد"
                  >
                    <FilePlus2 size={15} />
                    <span>عرض جديد</span>
                  </button>
                </div>
              )}
              {isTrashView && (
                <button
                  className="button outline-button folder-back-btn"
                  onClick={() => setIsTrashView(false)}
                  title="العودة للمكتبة"
                >
                  <ChevronRight size={15} />
                  <span>العودة للمكتبة</span>
                </button>
              )}
              <h1>{isTrashView ? 'سلة المحذوفات' : folderId ? currentFolder?.name : 'مساحة الأوراق'}</h1>
              <span className="count-chip">{visibleQuotes.length} عروض</span>
              {!isTrashView && folderId === null && data.folders.length > 0 && (
                <span className="count-chip folders">{data.folders.length} مجلدات</span>
              )}
            </div>
          </div>

          <div className="header-context-actions">
            {isTrashView && trashedCount > 0 && (
              <button className="button danger-button" onClick={emptyTrash}>
                <Trash2 size={14} />
                إفراغ السلة
              </button>
            )}
          </div>
        </div>

        <div className="library-toolbar">
          <div className="filter-set">
            {!isTrashView && (
              <>
                <label title="تصفية حسب الحالة">
                  <span className="sr-only">الحالة</span>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as typeof status)}
                  >
                    {statuses.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} />
                </label>

                <label title="تصفية حسب القالب">
                  <span className="sr-only">القالب</span>
                  <select
                    value={templateFilter}
                    onChange={(e) => setTemplateFilter(e.target.value)}
                  >
                    <option value="all">كل القوالب</option>
                    {starterTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} />
                </label>
              </>
            )}

            <label title="ترتيب العروض">
              <span className="sr-only">الترتيب</span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} />
            </label>

            <button
              className={`trash-toggle-btn ${isTrashView ? 'active' : ''}`}
              onClick={() => {
                setIsTrashView((prev) => !prev)
                setFolderId(null)
                setSelectedQuoteIds([])
              }}
              title={isTrashView ? 'العودة للمكتبة' : 'سلة المحذوفات'}
            >
              <Trash2 size={13} />
              <span>سلة المحذوفات</span>
              {trashedCount > 0 && <span className="trash-badge">{trashedCount}</span>}
            </button>
          </div>

          {/* Apple Segmented Grid Size Control: 4 Sizes */}
          <div className="grid-size-segmented" role="radiogroup" aria-label="حجم شبكة الأوراق">
            <button
              type="button"
              className={gridSize === 'compact' ? 'active' : ''}
              onClick={() => handleSetGridSize('compact')}
              title="عرض دقيق (125px)"
            >
              دقيق
            </button>
            <button
              type="button"
              className={gridSize === 'small' ? 'active' : ''}
              onClick={() => handleSetGridSize('small')}
              title="عرض صغير (150px)"
            >
              صغير
            </button>
            <button
              type="button"
              className={gridSize === 'medium' ? 'active' : ''}
              onClick={() => handleSetGridSize('medium')}
              title="عرض متوسط (175px)"
            >
              متوسط
            </button>
            <button
              type="button"
              className={gridSize === 'large' ? 'active' : ''}
              onClick={() => handleSetGridSize('large')}
              title="عرض كبير (198px)"
            >
              كبير
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Selection Document Hub & Action Drop Targets */}
      <SelectionDocumentHub
        selectedQuotes={data.quotes.filter((q) => selectedQuoteIds.includes(q.id))}
        folders={data.folders}
        currentFolderId={folderId}
        isTrashView={isTrashView}
        isDraggingAnyCard={dragQuoteId !== null}
        activeMenuId={activeMenuId}
        setActiveMenuId={setActiveMenuId}
        onAddQuoteToSelection={handleAddQuoteToSelection}
        onRemoveQuoteFromSelection={handleRemoveQuoteFromSelection}
        onClearSelection={() => setSelectedQuoteIds([])}
        onBulkTrash={bulkTrash}
        onBulkPermanentDelete={bulkPermanentDelete}
        onBulkRestore={bulkRestore}
        onBulkMoveToFolder={bulkMoveToFolder}
        onCreateFolderWithSelected={() => {
          showPrompt({
            title: 'مجلد جديد للمحدد',
            message: `أدخل اسم المجلد لنقل ${selectedQuoteIds.length} عروض إليه:`,
            placeholder: 'اسم المجلد...',
            confirmText: 'إنشاء ونقل',
            icon: 'folder',
            onConfirm: (name) => {
              const trimmed = name.trim()
              if (trimmed) {
                createFolder(trimmed, selectedQuoteIds)
                setSelectedQuoteIds([])
              }
            },
          })
        }}
        onBulkCopy={bulkCopyQuotes}
        onBulkChangeStatus={bulkChangeStatus}
      />

      <div
        ref={gridContainerRef}
        className={`paper-space size-${gridSize}`}
        onDragOver={(e) => e.preventDefault()}
      >
        {/* Folder tiles (shown only at root when not in trash view and not searching) */}
        {!isTrashView &&
          folderId === null &&
          !query.trim() &&
          data.folders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              quoteCount={
                data.quotes.filter((q) => q.folderId === folder.id && !q.deletedAt).length
              }
              isDragTarget={dragTargetType === 'folder' && dragTargetId === folder.id}
              absorbingQuote={absorbingDrop?.folderId === folder.id ? absorbingDrop : null}
              isNewlyCreated={flyingFolderId === folder.id}
              isMenuOpen={activeMenuId === `folder-${folder.id}`}
              onToggleMenu={() =>
                setActiveMenuId((curr) =>
                  curr === `folder-${folder.id}` ? null : `folder-${folder.id}`,
                )
              }
              onCloseMenu={() => setActiveMenuId(null)}
              onOpen={() => setFolderId(folder.id)}
              onRename={() => renameFolder(folder)}
              onChangeColor={(color) => changeFolderColor(folder, color)}
              onDelete={() => deleteFolder(folder)}
              onDragHoverStart={() => handleDragHoverTarget(folder.id, 'folder')}
              onDragHoverEnd={() => handleDragLeaveTarget(folder.id)}
              onDropQuote={(e) => {
                const isSelectionDoc = e.dataTransfer?.getData('application/anfas-selection-doc')
                const quoteIdData = e.dataTransfer?.getData('application/anfas-quote-id')
                const textData = e.dataTransfer?.getData('text/plain')
                const sourceId = dragQuoteId || quoteIdData || textData

                // تصفير مؤشرات السحب والتركيز فور الإفلات
                handleDragLeaveTarget(folder.id)

                // إذا كان المسحوب هو مستند التحديد التفاعلي (أو هناك عروض محددة تم سحبها)
                if (isSelectionDoc || selectedQuoteIds.length > 0) {
                  bulkMoveToFolder(folder.id)
                } else if (sourceId) {
                  handleDropOnFolder(sourceId, folder.id)
                }
              }}
            />
          ))}

        {/* Quote tiles */}
        {visibleQuotes.map((quote, index) => (
          <QuoteTile
            key={quote.id}
            quote={quote}
            folders={data.folders}
            isTrashView={isTrashView}
            isSelected={selectedQuoteIds.includes(quote.id)}
            isDragging={dragQuoteId === quote.id}
            isAbsorbingSource={
              absorbingDrop?.quoteId === quote.id || mergingQuotes?.sourceId === quote.id
            }
            isDragTarget={
              dragTargetType === 'quote' && dragTargetId === quote.id && dragQuoteId !== quote.id
            }
            draggedQuote={dragQuoteId ? data.quotes.find((q) => q.id === dragQuoteId) : null}
            mergingFolder={
              mergingQuotes && mergingQuotes.targetId === quote.id ? mergingQuotes : null
            }
            isCrumplingDelete={deletingQuoteId === quote.id}
            isMenuOpen={activeMenuId === `quote-${quote.id}`}
            onToggleMenu={() =>
              setActiveMenuId((curr) =>
                curr === `quote-${quote.id}` ? null : `quote-${quote.id}`,
              )
            }
            onCloseMenu={() => setActiveMenuId(null)}
            onOpen={() => openQuote(quote.id)}
            onToggleSelect={() => toggleSelectQuote(quote.id)}
            onUpdate={(patch) => updateQuote(quote.id, patch)}
            onCopy={() => copyQuote(quote)}
            onDelete={() =>
              isTrashView ? permanentDeleteQuote(quote) : softDeleteQuote(quote)
            }
            onRestore={() => restoreQuote(quote)}
            onMoveToFolder={(fId) => {
              updateQuote(quote.id, { folderId: fId })
              const fName = fId ? data.folders.find((f) => f.id === fId)?.name : 'مساحة العمل'
              setToast(`نُقل «${quote.title}» إلى «${fName}»`)
            }}
            onCreateFolderWith={() => {
              showPrompt({
                title: 'إنشاء مجلد جديد',
                message: `اسم المجلد الجديد لنقل «${quote.title}» إليه:`,
                placeholder: 'اسم المجلد...',
                confirmText: 'إنشاء ونقل',
                icon: 'folder',
                onConfirm: (name) => {
                  const trimmed = name.trim()
                  if (trimmed) createFolder(trimmed, [quote.id])
                },
              })
            }}
            onReorder={(dir) => reorderQuote(quote.id, dir)}
            canReorderUp={index > 0}
            canReorderDown={index < visibleQuotes.length - 1}
            onDragStart={() => {
              setDragQuoteId(quote.id)
            }}
            onDragEnd={() => {
              setDragQuoteId(null)
              setDragTargetId(null)
              setDragTargetType(null)
            }}
            onDragHoverStart={() => handleDragHoverTarget(quote.id, 'quote')}
            onDragHoverEnd={() => handleDragLeaveTarget(quote.id)}
            onDropQuote={(e) => {
              const sourceId = dragQuoteId || e.dataTransfer?.getData?.('text/plain')
              if (sourceId && sourceId !== quote.id) {
                handleDropOnQuote(sourceId, quote.id)
              }
              setDragQuoteId(null)
              setDragTargetId(null)
              setDragTargetType(null)
            }}
          />
        ))}

        {!isTrashView && (
          <div className="create-tile-wrap" data-flip-id="create-new-tile">
            <div className="card-top-header create-top-header">
              <div className="card-title-row">
                <span className="card-title create-card-title">عرض جديد</span>
              </div>
              <div className="card-meta-row">
                <span className="folder-count-pill create-badge">صفحة بيضاء</span>
              </div>
            </div>
            <button
              className="create-paper-tile"
              onClick={() => setScreen('templates')}
              aria-label="إنشاء عرض سعر جديد من قالب"
            >
              <div className="create-tile-inner">
                <span className="create-plus">
                  <Plus size={22} />
                </span>
                <b>إنشاء عرض</b>
                <small>اختر قالبًا أو ابدأ من الصفر</small>
              </div>
            </button>
            <div className="card-footer-bar create-footer-bar">
              <span className="create-footer-note">قوالب جاهزة</span>
            </div>
          </div>
        )}
      </div>

      {visibleQuotes.length === 0 && (!folderId || data.folders.length === 0) && (
        <div className="empty-library">
          <FileText size={32} />
          <b>
            {isTrashView
              ? 'سلة المحذوفات فارغة'
              : folderId
                ? 'المجلد فارغ'
                : 'مساحة الأوراق فارغة'}
          </b>
          <span>
            {isTrashView
              ? 'لم يتم حذف أي عرض مؤخرًا.'
              : folderId
                ? 'لا توجد أوراق داخل هذا المجلد. يمكنك إنشاء عرض جديد أو نقل أوراق إليه.'
                : 'ابدأ بعرض من قالب جاهز، وستظهر معاينته هنا كأوراق عمل حقيقية.'}
          </span>
          {!isTrashView && (
            <button className="button primary-button" onClick={() => setScreen('templates')}>
              <Plus size={16} />
              إنشاء عرض جديد
            </button>
          )}
        </div>
      )}

      <footer className="library-footer">
        <span>
          {workspaceMode === 'folder'
            ? `مرتبط بمجلد الجهاز: ${workspaceName}`
            : workspaceMode === 'reconnect'
              ? `انقطع إذن المجلد (${workspaceName}) — التعديلات محفوظة مؤقتًا`
              : workspaceMode === 'memory'
                ? 'مساحة تجريبية في الذاكرة (للتطوير فقط)'
                : 'مساحة متصفح مؤقتة — اربط مجلدًا من الشريط العلوي للحفظ في ملفاتك'}
        </span>
        <span>اسحب ورقة فوق ورقة لتجميعها في مجلد، أو استخدم خيار «نقل إلى مجلد» من القائمة</span>
      </footer>
    </main>
  )
}

