import React, { useState, useRef } from 'react'
import {
  Archive,
  Copy,
  Files,
  Folder,
  FolderMinus,
  FolderPlus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'
import type { Quote, QuoteFolder, QuoteStatus } from '../../domain/quote'

export interface SelectionDocumentHubProps {
  selectedQuotes: Quote[]
  folders: QuoteFolder[]
  currentFolderId: string | null
  isTrashView: boolean
  isDraggingAnyCard: boolean
  activeMenuId: string | null
  setActiveMenuId: (id: string | null | ((curr: string | null) => string | null)) => void
  onAddQuoteToSelection: (quoteId: string) => void
  onRemoveQuoteFromSelection: (quoteId: string) => void
  onClearSelection: () => void
  onBulkTrash: () => void
  onBulkPermanentDelete: () => void
  onBulkRestore: () => void
  onBulkMoveToFolder: (folderId: string | null) => void
  onCreateFolderWithSelected: () => void
  onBulkCopy: () => void
  onBulkChangeStatus: (status: QuoteStatus) => void
}

interface RadialActionItem {
  key: string
  label: string
  icon: React.ReactNode
  color: string
  glowColor: string
  isDanger?: boolean
  isPrimary?: boolean
  hasMenu?: boolean
  isMenuOpen?: boolean
  menuContent?: React.ReactNode
  onAction: () => void
}

export function SelectionDocumentHub({
  selectedQuotes,
  folders,
  currentFolderId,
  isTrashView,
  isDraggingAnyCard,
  activeMenuId,
  setActiveMenuId,
  onAddQuoteToSelection,
  onRemoveQuoteFromSelection,
  onClearSelection,
  onBulkTrash,
  onBulkPermanentDelete,
  onBulkRestore,
  onBulkMoveToFolder,
  onCreateFolderWithSelected,
  onBulkCopy,
  onBulkChangeStatus,
}: SelectionDocumentHubProps) {
  const [isDragOverHub, setIsDragOverHub] = useState(false)
  const [isDraggingHub, setIsDraggingHub] = useState(false)
  const [activeActionHover, setActiveActionHover] = useState<string | null>(null)
  const [showPreviewDrawer, setShowPreviewDrawer] = useState(false)

  const isFolderMenuOpen = activeMenuId === 'hub-folder-menu'
  const isStatusMenuOpen = activeMenuId === 'hub-status-menu'

  const count = selectedQuotes.length
  const hubRef = useRef<HTMLDivElement>(null)
  const hubDragCounterRef = useRef(0)

  // 1. Handling drop of a Quote card ONTO the Selection Hub
  const handleHubDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    hubDragCounterRef.current += 1
    if (hubDragCounterRef.current === 1) {
      setIsDragOverHub(true)
    }
  }

  const handleHubDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
    if (!isDragOverHub && hubDragCounterRef.current === 0) {
      hubDragCounterRef.current = 1
      setIsDragOverHub(true)
    }
  }

  const handleHubDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    hubDragCounterRef.current = Math.max(0, hubDragCounterRef.current - 1)
    if (hubDragCounterRef.current === 0) {
      setIsDragOverHub(false)
    }
  }

  const handleHubDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    hubDragCounterRef.current = 0
    setIsDragOverHub(false)

    const quoteId =
      e.dataTransfer.getData('application/anfas-quote-id') ||
      e.dataTransfer.getData('text/plain')

    if (quoteId) {
      onAddQuoteToSelection(quoteId)
    }
  }

  // 2. Handling Drag of the Selection Hub itself towards action targets
  const handleHubDragStart = (e: React.DragEvent) => {
    if (count === 0) return
    e.dataTransfer.setData('application/anfas-selection-doc', 'true')
    e.dataTransfer.setData('text/plain', selectedQuotes.map((q) => q.id).join(','))
    e.dataTransfer.effectAllowed = 'copyMove'
    setIsDraggingHub(true)
    setShowPreviewDrawer(false)
  }

  const handleHubDragEnd = () => {
    setIsDraggingHub(false)
    setActiveActionHover(null)
  }

  // 3. Action Targets: dragover / dragleave / drop handling
  const handleActionDragOver = (e: React.DragEvent, actionKey: string) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    if (activeActionHover !== actionKey) {
      setActiveActionHover(actionKey)
    }
  }

  const handleActionDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setActiveActionHover(null)
  }

  const handleActionDrop = (
    e: React.DragEvent,
    actionHandler: () => void,
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setActiveActionHover(null)
    setIsDraggingHub(false)

    const isDoc = e.dataTransfer.getData('application/anfas-selection-doc')
    const quoteId = e.dataTransfer.getData('application/anfas-quote-id')

    if (isDoc || count > 0) {
      actionHandler()
    } else if (quoteId) {
      onAddQuoteToSelection(quoteId)
      setTimeout(() => actionHandler(), 50)
    }
  }

  // Sample accent colors for paper stack graphic (up to 5 sheets)
  const sampleAccents = selectedQuotes.slice(0, 5).map((q) => q.accent || '#0071e3')
  while (sampleAccents.length < 5) {
    sampleAccents.push(sampleAccents[sampleAccents.length - 1] || '#0071e3')
  }

  // Build the list of actions according to current view (Normal vs Trash)
  const actions: RadialActionItem[] = !isTrashView
    ? [
        {
          key: 'move',
          label: 'نقل إلى مجلد',
          icon: <Folder size={17} strokeWidth={2.1} />,
          color: '#0071e3',
          glowColor: 'rgba(0, 113, 227, 0.45)',
          hasMenu: true,
          isMenuOpen: isFolderMenuOpen,
          onAction: () =>
            setActiveMenuId((curr) => (curr === 'hub-folder-menu' ? null : 'hub-folder-menu')),
          menuContent: (
            <div className="hub-dropdown-menu" onClick={(e) => e.stopPropagation()}>
              {currentFolderId !== null && (
                <button
                  type="button"
                  onClick={() => {
                    onBulkMoveToFolder(null)
                    setActiveMenuId(null)
                  }}
                >
                  <FolderMinus size={14} />
                  إخراج لمساحة العمل
                </button>
              )}
              {folders
                .filter((f) => f.id !== currentFolderId)
                .map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      onBulkMoveToFolder(f.id)
                      setActiveMenuId(null)
                    }}
                  >
                    <Folder size={14} style={{ color: f.color }} />
                    {f.name}
                  </button>
                ))}
              <button
                type="button"
                onClick={() => {
                  onCreateFolderWithSelected()
                  setActiveMenuId(null)
                }}
              >
                <FolderPlus size={14} />+ مجلد جديد للمحدد
              </button>
            </div>
          ),
        },
        {
          key: 'copy',
          label: 'نسخ وتكرار',
          icon: <Copy size={17} strokeWidth={2.1} />,
          color: '#34c759',
          glowColor: 'rgba(52, 199, 89, 0.45)',
          onAction: onBulkCopy,
        },
        {
          key: 'status',
          label: 'الحالة والأرشفة',
          icon: <Archive size={17} strokeWidth={2.1} />,
          color: '#af52de',
          glowColor: 'rgba(175, 82, 222, 0.45)',
          hasMenu: true,
          isMenuOpen: isStatusMenuOpen,
          onAction: () =>
            setActiveMenuId((curr) => (curr === 'hub-status-menu' ? null : 'hub-status-menu')),
          menuContent: (
            <div className="hub-dropdown-menu" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  onBulkChangeStatus('مؤرشف')
                  setActiveMenuId(null)
                }}
              >
                <Archive size={14} />
                أرشفة المحدد
              </button>
              <button
                onClick={() => {
                  onBulkChangeStatus('مرسل')
                  setActiveMenuId(null)
                }}
              >
                تغيير إلى «مرسل»
              </button>
              <button
                onClick={() => {
                  onBulkChangeStatus('مقبول')
                  setActiveMenuId(null)
                }}
              >
                تغيير إلى «مقبول»
              </button>
              <button
                onClick={() => {
                  onBulkChangeStatus('مسودة')
                  setActiveMenuId(null)
                }}
              >
                تغيير إلى «مسودة»
              </button>
            </div>
          ),
        },
        {
          key: 'trash',
          label: 'سلة المحذوفات',
          icon: <Trash2 size={17} strokeWidth={2.1} />,
          color: '#ff3b30',
          glowColor: 'rgba(255, 59, 48, 0.5)',
          isDanger: true,
          onAction: onBulkTrash,
        },
        {
          key: 'clear',
          label: 'إلغاء التحديد',
          icon: <X size={17} strokeWidth={2.2} />,
          color: '#8e8e93',
          glowColor: 'rgba(142, 142, 147, 0.35)',
          onAction: onClearSelection,
        },
      ]
    : [
        {
          key: 'restore',
          label: 'استعادة المحدد',
          icon: <RotateCcw size={17} strokeWidth={2.1} />,
          color: '#34c759',
          glowColor: 'rgba(52, 199, 89, 0.45)',
          isPrimary: true,
          onAction: onBulkRestore,
        },
        {
          key: 'perm-delete',
          label: 'حذف نهائي',
          icon: <Trash2 size={17} strokeWidth={2.1} />,
          color: '#ff3b30',
          glowColor: 'rgba(255, 59, 48, 0.5)',
          isDanger: true,
          onAction: onBulkPermanentDelete,
        },
        {
          key: 'clear',
          label: 'إلغاء التحديد',
          icon: <X size={17} strokeWidth={2.2} />,
          color: '#8e8e93',
          glowColor: 'rgba(142, 142, 147, 0.35)',
          onAction: onClearSelection,
        },
      ]

  // Calculate coordinates for even distribution on the semi-radial arc
  // Radius R and angles are calculated to crown gracefully over the hub with zero collision and a generous breathing margin
  const radius = 104
  const startAngle = actions.length === 3 ? 42 : 32
  const endAngle = actions.length === 3 ? 138 : 148
  const angleStep = (endAngle - startAngle) / (actions.length - 1)

  return (
    <div
      ref={hubRef}
      className={`selection-hub-root ${count > 0 ? 'has-selection' : 'idle-mode'} ${
        isDraggingAnyCard ? 'card-drag-in-progress' : ''
      } ${isDraggingHub ? 'hub-is-dragged' : ''}`}
      aria-label="مستند التحديد التفاعلي"
    >
      {/* PREVIEW DRAWER (List of selected documents with individual remove) */}
      {showPreviewDrawer && count > 0 && (
        <div className="selection-preview-drawer" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-header">
            <div className="drawer-title-row">
              <Files size={15} />
              <span>الأوراق المجمعة في المستند ({count})</span>
            </div>
            <button
              className="drawer-clear-btn"
              onClick={() => {
                onClearSelection()
                setShowPreviewDrawer(false)
              }}
              title="إفراغ المستند بالكامل"
            >
              إفراغ الكل
            </button>
          </div>

          <div className="drawer-items-list">
            {selectedQuotes.map((q) => (
              <div key={q.id} className="drawer-quote-item">
                <span className="drawer-item-accent" style={{ backgroundColor: q.accent }} />
                <div className="drawer-item-info">
                  <span className="drawer-item-title">{q.title || 'عرض بدون عنوان'}</span>
                  <span className="drawer-item-num">{q.number}</span>
                </div>
                <button
                  className="drawer-item-remove"
                  onClick={() => onRemoveQuoteFromSelection(q.id)}
                  title={`إزالة «${q.title}» من التحديد`}
                  aria-label={`إزالة ${q.title}`}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>

          <div className="drawer-footer-hint">
            <small>اسحب المستند أدناه إلى أيقونة الإجراء لتنفيذ العملية</small>
          </div>
        </div>
      )}

      {/* SEMI-RADIAL ACTION MENU (Arc positioned strictly above the hub) */}
      {count > 0 && (
        <div className="selection-radial-arc" aria-label="قائمة العمليات النصف دائرية">
          {actions.map((act, index) => {
            const angleDeg = startAngle + index * angleStep
            const angleRad = (angleDeg * Math.PI) / 180
            const x = Math.round(radius * Math.cos(angleRad))
            const y = Math.round(-radius * Math.sin(angleRad))
            const isHovered = activeActionHover === act.key

            return (
              <div
                key={act.key}
                className={`radial-action-node ${isHovered ? 'target-hovered' : ''} ${
                  act.isDanger ? 'is-danger' : ''
                } ${act.isPrimary ? 'is-primary' : ''} ${act.isMenuOpen ? 'menu-active' : ''}`}
                style={
                  {
                    '--x': `${x}px`,
                    '--y': `${y}px`,
                    '--delay': `${index * 35}ms`,
                    '--action-color': act.color,
                    '--action-glow': act.glowColor,
                  } as React.CSSProperties
                }
                onDragOver={(e) => handleActionDragOver(e, act.key)}
                onDragLeave={handleActionDragLeave}
                onDrop={(e) => handleActionDrop(e, act.onAction)}
                onClick={act.onAction}
                role="button"
                tabIndex={0}
                aria-label={act.label}
              >
                {/* Visual circular icon bubble */}
                <div className="radial-action-bubble">
                  {act.icon}
                </div>

                {/* Floating tooltip label appearing on hover or drag-over */}
                <span className="radial-action-tooltip">
                  {act.label}
                </span>

                {/* Submenu popover for actions with menus (e.g. Move to folder, Change status) */}
                {act.hasMenu && act.isMenuOpen && act.menuContent}
              </div>
            )
          })}
        </div>
      )}

      {/* THE VIRTUAL SELECTION DOCUMENT CAPSULE / HUB (Central Anchor) */}
      <div
        className={`selection-virtual-doc-hub ${isDragOverHub ? 'hub-drag-over' : ''} ${
          count > 0 ? 'is-draggable' : ''
        } stack-count-${Math.min(count, 5)}`}
        draggable={count > 0}
        onDragStart={handleHubDragStart}
        onDragEnd={handleHubDragEnd}
        onDragEnter={handleHubDragEnter}
        onDragOver={handleHubDragOver}
        onDragLeave={handleHubDragLeave}
        onDrop={handleHubDrop}
        onClick={() => {
          if (count > 0) setShowPreviewDrawer((v) => !v)
        }}
        title={
          count > 0
            ? 'اسحب المستند إلى الأيقونات لتنفيذ الإجراء، أو انقر لمعاينة المحتوى'
            : 'اسحب أوراق العروض إلى هنا لتحديدها'
        }
        role="button"
        tabIndex={0}
      >
        {/* Layered Paper Stack Visual with 1, 2, 3, 4, 5+ sheet configurations */}
        <div className="virtual-paper-stack" aria-hidden="true">
          {count === 0 ? (
            <div className="empty-paper-slot">
              <Files size={22} className="empty-slot-icon" />
            </div>
          ) : (
            <div className={`paper-stack-deck deck-size-${Math.min(count, 5)}`}>
              {/* Sheet 5: Background wing left (Appears at 5+ sheets) */}
              {count >= 5 && (
                <div
                  className="stacked-sheet sheet-layer-5"
                  style={{ '--sheet-color': sampleAccents[4] } as React.CSSProperties}
                />
              )}

              {/* Sheet 4: Background wing right (Appears at 4+ sheets) */}
              {count >= 4 && (
                <div
                  className="stacked-sheet sheet-layer-4"
                  style={{ '--sheet-color': sampleAccents[3] } as React.CSSProperties}
                />
              )}

              {/* Sheet 3: Left fan (Appears at 3+ sheets) */}
              {count >= 3 && (
                <div
                  className="stacked-sheet sheet-layer-3"
                  style={{ '--sheet-color': sampleAccents[2] } as React.CSSProperties}
                />
              )}

              {/* Sheet 2: Right fan (Appears at 2+ sheets) */}
              {count >= 2 && (
                <div
                  className="stacked-sheet sheet-layer-2"
                  style={{ '--sheet-color': sampleAccents[1] } as React.CSSProperties}
                />
              )}

              {/* Sheet 1: Front dominant sheet (Always visible when count >= 1) */}
              <div
                className="stacked-sheet sheet-layer-front"
                style={{ '--sheet-color': sampleAccents[0] } as React.CSSProperties}
              >
                <div className="sheet-mini-card">
                  <div className="sheet-mini-top-banner">
                    <span className="sheet-mini-logo-dot" />
                    <span className="sheet-mini-num-pill" />
                  </div>
                  <div className="sheet-mini-lines">
                    <i style={{ width: '75%' }} />
                    <i style={{ width: '50%' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Integrated Dynamic Counter Badge (1, 2, 3, 4, 5, +6, +7...) */}
          {count > 0 && (
            <div
              key={`hub-badge-${count}`}
              className={`hub-counter-badge ${count >= 6 ? 'is-plus-badge' : ''}`}
              dir="ltr"
            >
              {count >= 6 ? `+${count}` : count}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
