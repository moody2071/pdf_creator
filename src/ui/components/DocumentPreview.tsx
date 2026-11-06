import React from 'react'
import { formatMoney, quoteTotal, type Quote } from '../../domain/quote'
import { getExecutivePalette } from '../types'

export function DocumentPreview({
  quote,
  accent,
  onCornerClick,
}: {
  quote: Quote
  accent: string
  onCornerClick?: () => void
}) {
  const palette = getExecutivePalette(accent || quote.accent)
  const totalAmount = quoteTotal(quote)

  return (
    <div
      className="document-preview"
      style={
        {
          '--doc-accent': palette.primary,
          '--doc-primary': palette.primary,
          '--doc-secondary': palette.secondary,
          '--doc-banner-bg': palette.bannerGradient,
          '--doc-soft-tint': palette.softTint,
        } as React.CSSProperties
      }
    >
      <div className="doc-sheet-stack" />
      <div className="doc-sheet-face">
        {onCornerClick && (
          <button
            type="button"
            className="paper-corner-curl-btn"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onCornerClick()
            }}
            title="المس زاوية الورقة لطيها وتحديدها"
            aria-label="طي زاوية الورقة"
          />
        )}
        {/* Mini Executive Header Banner */}
        <div className="doc-header">
          <div className="doc-header-top">
            <span className="doc-logo">
              <span className="doc-logo-emblem">ط</span>
              <b>طِرَاس</b>
            </span>
            <span className="doc-number-badge">{quote.number}</span>
          </div>
          <div className="doc-title">{quote.title || 'وثيقة عرض سعر'}</div>
        </div>

        <div className="doc-body-area">
          <div className="doc-client-card">
            <div className="doc-client-meta-col">
              <span className="doc-client-label">الطرف الثاني (العميل)</span>
              <b className="doc-client-name">{quote.client || 'اسم العميل'}</b>
            </div>
            <span className="doc-mini-date">{quote.updatedAt.slice(0, 10)}</span>
          </div>

          <div className="doc-items-summary">
            <div className="doc-table-head">
              <span>البند / البيان</span>
              <span>الإجمالي</span>
            </div>
            {quote.items.slice(0, 3).map((item, idx) => (
              <div className="doc-table-row" key={item.id}>
                <span className="doc-row-title">
                  <i className="doc-row-idx">{idx + 1}.</i> {item.title || 'بند جديد'}
                </span>
                <span className="doc-row-price">{formatMoney(item.quantity * item.unitPrice)}</span>
              </div>
            ))}
          </div>

          <div className="doc-total-box">
            <span>الإجمالي الكلي</span>
            <b>{formatMoney(totalAmount)}</b>
          </div>
        </div>

        <div className="doc-footer-bar">
          <span>وثيقة عرض فني ومالي</span>
          <span className="doc-stamp-chip">A4</span>
        </div>
      </div>
    </div>
  )
}

