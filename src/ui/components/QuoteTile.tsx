import React, { useEffect, useRef, useState } from 'react'
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronLeft,
  Copy,
  Files,
  FileText,
  Folder,
  FolderMinus,
  FolderPlus,
  MoreHorizontal,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { formatMoney, quoteTotal, type Quote, type QuoteFolder, type QuoteStatus } from '../../domain/quote'
import { statuses } from '../types'
import { DocumentPreview } from './DocumentPreview'

export function QuoteTile({
  quote,
  folders,
  isTrashView,
  isSelected,
  isDragging,
  isAbsorbingSource,
  isCrumplingDelete,
  isDragTarget,
  draggedQuote,
  mergingFolder,
  isMenuOpen,
  onOpen,
  onToggleSelect,
  onUpdate,
  onCopy,
  onDelete,
  onRestore,
  onMoveToFolder,
  onCreateFolderWith,
  onReorder,
  canReorderUp,
  canReorderDown,
  onToggleMenu,
  onCloseMenu,
  onDragStart,
  onDragEnd,
  onDragHoverStart,
  onDragHoverEnd,
  onDropQuote,
}: {
  quote: Quote
  folders: QuoteFolder[]
  isTrashView: boolean
  isSelected: boolean
  isDragging: boolean
  isAbsorbingSource: boolean
  isCrumplingDelete?: boolean
  isDragTarget: boolean
  draggedQuote?: Quote | null
  mergingFolder?: {
    sourceQuote: Quote
    targetQuote: Quote
    newFolderName: string
    newFolderColor: string
  } | null
  isMenuOpen: boolean
  onOpen: () => void
  onToggleSelect: () => void
  onUpdate: (patch: Partial<Quote>) => void
  onCopy: () => void
  onDelete: () => void
  onRestore?: () => void
  onMoveToFolder: (folderId: string | null) => void
  onCreateFolderWith: () => void
  onReorder: (dir: 'up' | 'down') => void
  canReorderUp: boolean
  canReorderDown: boolean
  onToggleMenu: () => void
  onCloseMenu: () => void
  onDragStart: () => void
  onDragEnd: () => void
  onDragHoverStart: () => void
  onDragHoverEnd: () => void
  onDropQuote: (e: React.DragEvent) => void
}) {
  const [moveOpen, setMoveOpen] = useState(false)
  const dragCounterRef = useRef(0)
  const hoverTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isMenuOpen) setMoveOpen(false)
  }, [isMenuOpen])

  useEffect(() => {
    if (!isDragTarget) {
      dragCounterRef.current = 0
    }
  }, [isDragTarget])

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        window.clearTimeout(hoverTimerRef.current)
      }
    }
  }, [])

  const handleDragStart = (e: React.DragEvent) => {
    try {
      e.dataTransfer.setData('text/plain', quote.id)
      e.dataTransfer.setData('application/anfas-quote-id', quote.id)
      e.dataTransfer.effectAllowed = 'copyMove'
    } catch {}
    onDragStart()
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current += 1
    if (dragCounterRef.current === 1) {
      if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = window.setTimeout(() => {
        onDragHoverStart()
      }, 140)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    if (!isDragTarget && dragCounterRef.current === 0) {
      dragCounterRef.current = 1
      if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = window.setTimeout(() => {
        onDragHoverStart()
      }, 140)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1)
    if (dragCounterRef.current === 0) {
      if (hoverTimerRef.current) {
        window.clearTimeout(hoverTimerRef.current)
        hoverTimerRef.current = null
      }
      onDragHoverEnd()
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    onDropQuote(e)
  }

  const statusClass =
    quote.status === 'جاهز'
      ? 'ready'
      : quote.status === 'مرسل'
        ? 'sent'
        : quote.status === 'مقبول'
          ? 'accepted'
          : quote.status === 'مؤرشف'
            ? 'archived'
            : 'draft'

  return (
    <article
      data-flip-id={`quote-${quote.id}`}
      className={`paper-tile ${isDragTarget ? 'drag-target' : ''} ${isSelected ? 'selected' : ''} ${
        isDragging ? 'dragging' : ''
      } ${isAbsorbingSource ? 'absorbing-source' : ''} ${
        mergingFolder ? 'merging-target folder-tile-wrap folder-absorbing' : ''
      } ${isCrumplingDelete ? 'is-crumpling-delete' : ''} ${isTrashView ? 'in-trash' : ''} ${
        isMenuOpen ? 'menu-active' : ''
      }`}
      draggable={!isTrashView && !isCrumplingDelete}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isCrumplingDelete && (
        <div className="crumple-trash-container" aria-hidden="true">
          {/* 1. Paper crumpling into a textured 3D paper ball and dunking */}
          <div className="paper-ball-wrapper">
            <div className="crumpled-paper-ball">
              <div className="ball-crease c1" />
              <div className="ball-crease c2" />
              <div className="ball-crease c3" />
              <div className="ball-crease c4" />
              <div className="ball-sheet-content">
                <DocumentPreview quote={quote} accent={quote.accent} />
              </div>
            </div>
          </div>

          {/* 2. Apple-style Modern Wastebasket popping up to catch the ball */}
          <div className="trash-can-rig">
            <div className="trash-lid">
              <span className="trash-lid-handle" />
              <span className="trash-lid-plate" />
            </div>
            <div className="trash-interior-back" />
            <div className="trash-basket">
              <div className="trash-grooves">
                <i />
                <i />
                <i />
              </div>
              <Trash2 size={16} className="trash-basket-icon" />
            </div>
            <div className="trash-shadow-base" />
          </div>

          {/* 3. Poof impact burst upon catch */}
          <div className="trash-poof-burst">
            <span className="poof-dot p1" />
            <span className="poof-dot p2" />
            <span className="poof-dot p3" />
            <span className="poof-dot p4" />
          </div>
        </div>
      )}

      {!mergingFolder && (
        <button
          type="button"
          className={`tile-select-badge ${isSelected ? 'is-selected' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleSelect()
          }}
          aria-label={isSelected ? `إلغاء تحديد ${quote.title}` : `تحديد ${quote.title}`}
          title={isSelected ? 'إلغاء التحديد' : 'تحديد الورقة'}
        >
          <span className="select-badge-circle">
            <Check size={11} strokeWidth={3} className="select-check-icon" />
          </span>
        </button>
      )}

      {/* TOP HEADER: Important things directly on top */}
      {mergingFolder ? (
        <div className="card-top-header folder-top-header">
          <div className="card-title-row">
            <span className="card-title folder-title-txt" title={mergingFolder.newFolderName}>
              {mergingFolder.newFolderName}
            </span>
            <span className="folder-count-badge">
              2 عروض
              <span
                className="plus-one-chip"
                dir="ltr"
                style={{
                  backgroundColor: mergingFolder.newFolderColor,
                  boxShadow: `0 4px 14px ${mergingFolder.newFolderColor}80`,
                }}
              >
                +2
              </span>
            </span>
          </div>
        </div>
      ) : (
        <div className="card-top-header">
        <div className="card-title-row">
          <button className="card-title" onClick={onOpen} title={quote.title}>
            {quote.title}
          </button>
          <div className={`tile-menu-anchor ${isMenuOpen ? 'menu-active' : ''}`}>
            <button
              className="icon-button"
              aria-label="إجراءات الورقة"
              onClick={(e) => {
                e.stopPropagation()
                onToggleMenu()
              }}
            >
              <MoreHorizontal size={15} />
            </button>

            {isMenuOpen && (
              <div className="tile-menu" onClick={(e) => e.stopPropagation()}>
                {!isTrashView ? (
                  <>
                    <button
                      onClick={() => {
                        onOpen()
                        onCloseMenu()
                      }}
                    >
                      <FileText size={14} />
                      فتح وتحرير
                    </button>
                    <button
                      onClick={() => {
                        onCopy()
                        onCloseMenu()
                      }}
                    >
                      <Copy size={14} />
                      تكرار العرض
                    </button>
                    <button
                      onClick={() => {
                        onToggleSelect()
                        onCloseMenu()
                      }}
                    >
                      <Files size={14} />
                      {isSelected ? 'إزالة من مستند التحديد' : 'إضافة لمستند التحديد'}
                    </button>
                    <button onClick={() => setMoveOpen((value) => !value)}>
                      <Folder size={14} />
                      نقل إلى مجلد <ChevronLeft size={13} />
                    </button>
                    {moveOpen && (
                      <div className="folder-submenu">
                        {folders.map((folder) => (
                          <button
                            key={folder.id}
                            onClick={() => {
                              onMoveToFolder(folder.id)
                              onCloseMenu()
                            }}
                          >
                            <Folder size={13} />
                            {folder.name}
                          </button>
                        ))}
                        {quote.folderId && (
                          <button
                            onClick={() => {
                              onMoveToFolder(null)
                              onCloseMenu()
                            }}
                          >
                            <FolderMinus size={13} />
                            إخراج إلى مساحة العمل
                          </button>
                        )}
                        <button
                          onClick={() => {
                            onCreateFolderWith()
                            onCloseMenu()
                          }}
                        >
                          <FolderPlus size={13} />
                          + مجلد جديد لهذه الورقة
                        </button>
                      </div>
                    )}
                    {canReorderUp && (
                      <button
                        onClick={() => {
                          onReorder('up')
                          onCloseMenu()
                        }}
                      >
                        <ArrowUp size={14} />
                        تحريك للأمام
                      </button>
                    )}
                    {canReorderDown && (
                      <button
                        onClick={() => {
                          onReorder('down')
                          onCloseMenu()
                        }}
                      >
                        <ArrowDown size={14} />
                        تحريك للخلف
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onUpdate({ status: quote.status === 'مؤرشف' ? 'مسودة' : 'مؤرشف' })
                        onCloseMenu()
                      }}
                    >
                      <Archive size={14} />
                      {quote.status === 'مؤرشف' ? 'إلغاء الأرشفة' : 'أرشفة'}
                    </button>
                    <button
                      onClick={() => {
                        onDelete()
                        onCloseMenu()
                      }}
                      className="danger"
                    >
                      <Trash2 size={14} />
                      نقل لسلة المحذوفات
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        onRestore?.()
                        onCloseMenu()
                      }}
                    >
                      <RotateCcw size={14} />
                      استعادة العرض
                    </button>
                    <button
                      onClick={() => {
                        onDelete()
                        onCloseMenu()
                      }}
                      className="danger"
                    >
                      <Trash2 size={14} />
                      حذف نهائي
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="card-meta-row">
          <label className={`status-badge ${statusClass}`}>
            <i />
            <select
              aria-label="حالة العرض"
              value={quote.status}
              disabled={isTrashView}
              onChange={(e) => onUpdate({ status: e.target.value as QuoteStatus })}
            >
              {statuses
                .filter((item) => item !== 'الكل')
                .map((item) => (
                  <option key={item}>{item}</option>
                ))}
            </select>
            <ChevronDown size={11} />
          </label>

          <span className="card-client-pill" title={quote.client || 'لم يحدد العميل'}>
            <span className="client-dot-mini">{quote.client?.slice(0, 1) || '؟'}</span>
            <span className="client-name-txt">{quote.client || 'لم يحدد العميل'}</span>
          </span>
        </div>
      </div>
      )}

      {/* MIDDLE: Miniature preview */}
      <button
        className={mergingFolder ? 'paper-hit-area folder-tile' : 'paper-hit-area'}
        onClick={onOpen}
        aria-label={mergingFolder ? `مجلد ${mergingFolder.newFolderName}` : `فتح ${quote.title}`}
      >
        {mergingFolder ? (
          <div
            className="folder-art"
            style={{ '--folder-color': mergingFolder.newFolderColor } as React.CSSProperties}
          >
            <div className="folder-tab" />
            {/* Peeking A4 sheets nested inside the folder */}
            <div className="folder-paper folder-paper-back" />
            <div className="folder-paper folder-paper-mid">
              <span className="folder-paper-line short" />
              <span className="folder-paper-line long" />
            </div>

            {/* The TWO animated sheets sliding into the folder pocket from above */}
            <div
              className="folder-absorbing-sheet merge-absorbing-sheet-left"
              style={{ '--doc-accent': quote.accent } as React.CSSProperties}
            >
              <div className="absorbing-mini-sheet">
                <div className="sheet-top-accent" />
                <div className="sheet-content-preview">
                  <div className="sheet-header-line">
                    <span className="sheet-brand-dot" />
                    <span className="absorbing-mini-num">{quote.number}</span>
                  </div>
                  <span className="absorbing-mini-title">
                    {quote.title || 'عرض سعر'}
                  </span>
                  <div className="sheet-skeleton-lines">
                    <span className="skel-line" style={{ width: '80%' }} />
                    <span className="skel-line" style={{ width: '55%' }} />
                  </div>
                </div>
              </div>
            </div>

            <div
              className="folder-absorbing-sheet merge-absorbing-sheet-right"
              style={{ '--doc-accent': mergingFolder.sourceQuote.accent } as React.CSSProperties}
            >
              <div className="absorbing-mini-sheet">
                <div className="sheet-top-accent" />
                <div className="sheet-content-preview">
                  <div className="sheet-header-line">
                    <span className="sheet-brand-dot" />
                    <span className="absorbing-mini-num">{mergingFolder.sourceQuote.number}</span>
                  </div>
                  <span className="absorbing-mini-title">
                    {mergingFolder.sourceQuote.title || 'عرض سعر'}
                  </span>
                  <div className="sheet-skeleton-lines">
                    <span className="skel-line" style={{ width: '80%' }} />
                    <span className="skel-line" style={{ width: '55%' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="folder-front-jacket">
              <div className="folder-clasp" />
              <div className="folder-mini-badge">
                <Folder size={18} />
              </div>
            </div>
          </div>
        ) : isDragTarget && draggedQuote ? (
          <div className="uno-card-fan-container">
            <div className="uno-card uno-card-base">
              <DocumentPreview quote={quote} accent={quote.accent} />
            </div>
            <div className="uno-card uno-card-incoming">
              <DocumentPreview quote={draggedQuote} accent={draggedQuote.accent} />
            </div>
          </div>
        ) : (
          <DocumentPreview
            quote={quote}
            accent={quote.accent}
            onCornerClick={onToggleSelect}
          />
        )}
      </button>

      {mergingFolder ? (
        <div className="card-footer-bar folder-footer-bar">
          <div className="folder-open-action">
            <span>فتح المجلد</span>
            <ChevronLeft size={12} />
          </div>
        </div>
      ) : (
        <div className="card-footer-bar">
          <span className="tile-total">{formatMoney(quoteTotal(quote))}</span>
          <span className="tile-date">
            {new Intl.DateTimeFormat('ar-SA', {
              day: 'numeric',
              month: 'short',
            }).format(new Date(`${quote.updatedAt.slice(0, 10)}T12:00:00`))}
          </span>
        </div>
      )}
    </article>
  )
}

