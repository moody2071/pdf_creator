import { useEffect, useRef, useState } from 'react'
import { AlertCircle, FolderPlus, Trash2 } from 'lucide-react'
import type { DialogConfig } from '../types'

export function AppleModalDialog({
  dialog,
  onClose,
}: {
  dialog: DialogConfig
  onClose: () => void
}) {
  const [inputValue, setInputValue] = useState(
    dialog.type === 'prompt' ? dialog.defaultValue ?? '' : '',
  )
  const inputRef = useRef<HTMLInputElement | null>(null)
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (dialog.type === 'prompt') {
      const timer = window.setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 50)
      return () => window.clearTimeout(timer)
    } else {
      const timer = window.setTimeout(() => {
        confirmBtnRef.current?.focus()
      }, 50)
      return () => window.clearTimeout(timer)
    }
  }, [dialog])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (dialog.type === 'prompt') {
      const trimmed = inputValue.trim()
      if (!trimmed) return
      dialog.onConfirm(trimmed)
    } else {
      dialog.onConfirm()
    }
    onClose()
  }

  const renderIcon = () => {
    if (dialog.icon === 'danger' || (dialog.type === 'confirm' && dialog.isDanger)) {
      return (
        <div className="apple-dialog-icon danger">
          <Trash2 size={24} />
        </div>
      )
    }
    if (dialog.icon === 'folder') {
      return (
        <div className="apple-dialog-icon folder">
          <FolderPlus size={24} />
        </div>
      )
    }
    return (
      <div className="apple-dialog-icon info">
        <AlertCircle size={24} />
      </div>
    )
  }

  return (
    <div
      className="apple-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="apple-modal-card"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="apple-modal-icon-wrap">{renderIcon()}</div>
        <h3 className="apple-modal-title">{dialog.title}</h3>
        {dialog.message && <p className="apple-modal-message">{dialog.message}</p>}

        {dialog.type === 'prompt' ? (
          <form className="apple-modal-form" onSubmit={handleSubmit}>
            <div className="apple-modal-input-wrap">
              <input
                ref={inputRef}
                type="text"
                className="apple-modal-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={dialog.placeholder}
              />
            </div>
            <div className="apple-modal-actions">
              <button type="button" className="button outline-button" onClick={onClose}>
                {dialog.cancelText ?? 'إلغاء'}
              </button>
              <button
                type="submit"
                className="button primary-button"
                disabled={!inputValue.trim()}
              >
                {dialog.confirmText ?? 'تأكيد'}
              </button>
            </div>
          </form>
        ) : (
          <div className="apple-modal-actions">
            <button type="button" className="button outline-button" onClick={onClose}>
              {dialog.cancelText ?? 'إلغاء'}
            </button>
            <button
              ref={confirmBtnRef}
              type="button"
              className={`button primary-button ${dialog.isDanger ? 'apple-modal-confirm-danger' : ''}`}
              onClick={() => handleSubmit()}
            >
              {dialog.confirmText ?? 'حسنًا'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  multiline?: boolean
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </label>
  )
}

