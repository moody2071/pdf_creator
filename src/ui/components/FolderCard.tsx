import React, { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Edit2, Folder, MoreHorizontal, Palette, Trash2 } from 'lucide-react'
import { formatQuoteCount, type QuoteFolder } from '../../domain/quote'
import { FOLDER_COLORS } from '../types'

export function FolderCard({
  folder,
  quoteCount,
  isDragTarget,
  absorbingQuote,
  isNewlyCreated,
  isMenuOpen,
  onOpen,
  onRename,
  onChangeColor,
  onDelete,
  onToggleMenu,
  onCloseMenu,
  onDragHoverStart,
  onDragHoverEnd,
  onDropQuote,
}: {
  folder: QuoteFolder
  quoteCount: number
  isDragTarget: boolean
  absorbingQuote?: { quoteTitle: string; quoteNumber: string; quoteAccent: string } | null
  isNewlyCreated?: boolean
  isMenuOpen: boolean
  onOpen: () => void
  onRename: () => void
  onChangeColor: (color: string) => void
  onDelete: () => void
  onToggleMenu: () => void
  onCloseMenu: () => void
  onDragHoverStart: () => void
  onDragHoverEnd: () => void
  onDropQuote: (e: React.DragEvent) => void
}) {
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const dragCounterRef = useRef(0)

  useEffect(() => {
    if (!isMenuOpen) setColorPickerOpen(false)
  }, [isMenuOpen])

  useEffect(() => {
    if (!isDragTarget) {
      dragCounterRef.current = 0
    }
  }, [isDragTarget])

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current += 1
    if (dragCounterRef.current === 1) {
      onDragHoverStart()
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    if (!isDragTarget && dragCounterRef.current === 0) {
      dragCounterRef.current = 1
      onDragHoverStart()
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1)
    if (dragCounterRef.current === 0) {
      onDragHoverEnd()
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0
    onDropQuote(e)
  }

  return (
    <div
      data-flip-id={`folder-${folder.id}`}
      className={`folder-tile-wrap ${isDragTarget ? 'drag-target' : ''} ${
        absorbingQuote || isNewlyCreated ? 'folder-absorbing' : ''
      } ${isNewlyCreated ? 'is-flying-to-shelf' : ''} ${isMenuOpen ? 'menu-active' : ''}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* TOP HEADER: Folder name, count, and actions immediately visible above */}
      <div className="card-top-header folder-top-header">
        <div className="card-title-row">
          <button className="card-title folder-name" onClick={onOpen} title={folder.name}>
            {folder.name}
          </button>
          <div className={`tile-menu-anchor ${isMenuOpen ? 'menu-active' : ''}`}>
            <button
              className="icon-button"
              aria-label="خيارات المجلد"
              onClick={(e) => {
                e.stopPropagation()
                onToggleMenu()
              }}
            >
              <MoreHorizontal size={15} />
            </button>

            {isMenuOpen && (
              <div className="tile-menu" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => {
                    onOpen()
                    onCloseMenu()
                  }}
                >
                  <Folder size={14} />
                  فتح المجلد
                </button>
                <button
                  onClick={() => {
                    onRename()
                    onCloseMenu()
                  }}
                >
                  <Edit2 size={14} />
                  إعادة تسمية
                </button>
                <button
                  onClick={() => {
                    setColorPickerOpen((v) => !v)
                  }}
                >
                  <Palette size={14} />
                  تغيير اللون
                </button>
                {colorPickerOpen && (
                  <div className="color-palette-bar">
                    {FOLDER_COLORS.map((col) => (
                      <button
                        key={col}
                        className="color-swatch"
                        style={{ background: col }}
                        onClick={() => {
                          onChangeColor(col)
                          setColorPickerOpen(false)
                          onCloseMenu()
                        }}
                        title="اختر هذا اللون"
                      />
                    ))}
                  </div>
                )}
                <button
                  onClick={() => {
                    onDelete()
                    onCloseMenu()
                  }}
                  className="danger"
                >
                  <Trash2 size={14} />
                  حذف المجلد
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="card-meta-row">
          <span className="folder-count-pill">
            {formatQuoteCount(quoteCount)}
            {absorbingQuote && (
              <span
                className="plus-one-chip"
                dir="ltr"
                style={{
                  backgroundColor: folder.color,
                  boxShadow: `0 4px 14px ${folder.color}80`,
                }}
              >
                {absorbingQuote.quoteNumber.startsWith('+')
                  ? absorbingQuote.quoteNumber
                  : '+1'}
              </span>
            )}
          </span>
        </div>
      </div>

      <button className="folder-tile" onClick={onOpen} aria-label={`فتح مجلد ${folder.name}`}>
        <div
          className="folder-art"
          style={{ '--folder-color': folder.color } as React.CSSProperties}
        >
          <div className="folder-tab" />
          {/* Peeking A4 sheets nested inside the folder */}
          <div className="folder-paper folder-paper-back" />
          <div className="folder-paper folder-paper-mid">
            <span className="folder-paper-line short" />
            <span className="folder-paper-line long" />
          </div>

          {/* Animated sheet sliding in on drop */}
          {absorbingQuote && (
            <div
              className={`folder-absorbing-sheet ${
                absorbingQuote.quoteNumber.startsWith('+') ? 'is-multi-absorb' : ''
              }`}
              style={{ '--doc-accent': absorbingQuote.quoteAccent } as React.CSSProperties}
            >
              {/* If it's a multi-sheet bundle, show stepped trailing papers underneath */}
              {absorbingQuote.quoteNumber.startsWith('+') && (
                <>
                  <div className="absorbing-mini-sheet-under under-sheet-2" />
                  <div className="absorbing-mini-sheet-under under-sheet-1" />
                </>
              )}
              <div className="absorbing-mini-sheet">
                <div className="sheet-top-accent" />
                <div className="sheet-content-preview">
                  <div className="sheet-header-line">
                    <span className="sheet-brand-dot" />
                    <span className="absorbing-mini-num">{absorbingQuote.quoteNumber}</span>
                  </div>
                  <span className="absorbing-mini-title">
                    {absorbingQuote.quoteTitle || 'عرض سعر'}
                  </span>
                  <div className="sheet-skeleton-lines">
                    <span className="skel-line" style={{ width: '80%' }} />
                    <span className="skel-line" style={{ width: '55%' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="folder-front-jacket">
            <div className="folder-clasp" />
            <div className="folder-mini-badge">
              <Folder size={18} />
            </div>
          </div>
        </div>
      </button>

      <div className="card-footer-bar folder-footer-bar">
        <button className="folder-open-action" onClick={onOpen}>
          <span>فتح المجلد</span>
          <ChevronLeft size={12} />
        </button>
      </div>
    </div>
  )
}

