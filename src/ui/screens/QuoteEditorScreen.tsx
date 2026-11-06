import { type RefObject } from 'react'
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Maximize2,
  Minimize2,
  Percent,
  Plus,
  Printer,
  RefreshCw,
  Scissors,
  ShieldCheck,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import {
  DEFAULT_TERMS,
  QUOTE_STATUSES,
  balancePaymentMilestones,
  calculateQuote,
  formatMoney,
  type Quote,
  type QuoteItem,
  type QuotePageSettings,
  type QuoteStatus,
} from '../../domain/quote'
import {
  type MarginPreset,
  type PaginatedQuoteDocument,
  type QuoteDocumentWarning,
} from '../../domain/pagination'
import { Field } from '../components/AppleModalDialog'
import { QuoteDocument } from '../components/QuoteDocument'
import { type SaveState, type Screen } from '../types'

export interface QuoteEditorScreenProps {
  activeQuote: Quote
  quoteCalc: ReturnType<typeof calculateQuote>
  paginatedDoc: PaginatedQuoteDocument
  isFullPreview: boolean
  saveState: SaveState
  editorSaveLabel: string
  selectedSection: string
  previewZoom: number
  currentPreviewPage: number
  a4StageRef: RefObject<HTMLDivElement>
  setIsFullPreview: (fn: boolean | ((v: boolean) => boolean)) => void
  setScreen: (screen: Screen) => void
  setSelectedSection: (sec: string) => void
  setPreviewZoom: (fn: (z: number) => number) => void
  setToast: (msg: string) => void
  handleRetrySave: () => void
  handleDownloadPrintableDocument: () => void
  handlePrintPdf: () => void
  updateQuote: (quoteId: string, patch: Partial<Quote>) => void
  updateItem: (itemId: string, patch: Partial<QuoteItem>) => void
  updatePageSettings: (patch: Partial<QuotePageSettings>) => void
  handleWarningAction: (warn: QuoteDocumentWarning) => void
  scrollToPreviewPage: (pageNumber: number) => void
  makeId: () => string
}

export function QuoteEditorScreen({
  activeQuote,
  quoteCalc,
  paginatedDoc,
  isFullPreview,
  saveState,
  editorSaveLabel,
  selectedSection,
  previewZoom,
  currentPreviewPage,
  a4StageRef,
  setIsFullPreview,
  setScreen,
  setSelectedSection,
  setPreviewZoom,
  setToast,
  handleRetrySave,
  handleDownloadPrintableDocument,
  handlePrintPdf,
  updateQuote,
  updateItem,
  updatePageSettings,
  handleWarningAction,
  scrollToPreviewPage,
  makeId,
}: QuoteEditorScreenProps) {
  return (
    <main className={`editor-screen ${isFullPreview ? 'is-full-preview' : ''}`}>
      <div className="editor-head no-print">
        <button
          className="back-link"
          onClick={() => {
            setIsFullPreview(false)
            setScreen('library')
          }}
        >
          <ChevronRight size={17} />
          المكتبة
        </button>
        <div className="editor-document-title">
          <h1>{activeQuote.title || 'عرض سعر جديد'}</h1>
          <span className="status-chip">
            <i />
            {activeQuote.status}
          </span>
        </div>
        <div className="editor-head-actions">
          <span
            className={`saved-indicator ${
              saveState === 'pending-reconnect' || saveState === 'write-error'
                ? 'unsaved'
                : saveState === 'saving'
                  ? 'saving'
                  : ''
            }`}
          >
            {saveState === 'pending-reconnect' || saveState === 'write-error' ? (
              <AlertCircle size={15} />
            ) : (
              <Check size={15} />
            )}
            {editorSaveLabel}
          </span>
          {(saveState === 'pending-reconnect' || saveState === 'write-error') && (
            <button className="button outline-button" onClick={handleRetrySave}>
              <RefreshCw size={14} />
              إعادة ربط المجلد
            </button>
          )}
          <button
            className={`button outline-button ${isFullPreview ? 'active-preview-btn' : ''}`}
            onClick={() => setIsFullPreview((v) => !v)}
          >
            {isFullPreview ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {isFullPreview ? 'العودة للتحرير' : 'معاينة كاملة'}
          </button>
          <button
            className="button outline-button"
            onClick={handleDownloadPrintableDocument}
            title="تنزيل ملف وثيقة A4 مستقل قابل للطباعة والأرشفة"
          >
            <Download size={15} />
            تنزيل وثيقة A4
          </button>
          <button
            className="button outline-button print-pdf-btn"
            onClick={handlePrintPdf}
            title="طباعة أو حفظ كملف PDF بدقة A4 قياسية"
          >
            <Printer size={15} />
            طباعة / حفظ PDF
          </button>
          <button
            className="button primary-button"
            onClick={() => {
              setIsFullPreview(false)
              setScreen('library')
              setToast(
                saveState === 'saved'
                  ? 'العرض محفوظ في مساحة العمل'
                  : 'التعديلات محفوظة مؤقتًا — أعد ربط المجلد لمزامنة الملفات',
              )
            }}
          >
            <Check size={16} />
            إنهاء
          </button>
        </div>
      </div>

      <div className="editor-workarea">
        {!isFullPreview && (
          <aside className="editor-form no-print">
            <div className="form-heading">
              <span>أقسام العرض</span>
              <small>
                {activeQuote.templateSnapshot.name} · إصدار{' '}
                {activeQuote.templateSnapshot.version}
              </small>
            </div>
            <div className="section-list">
              {[
                { id: 'بيانات العرض', label: 'بيانات العرض', icon: FileText },
                { id: 'العميل والمشروع', label: 'العميل والمشروع', icon: Building2 },
                { id: 'البنود والأسعار', label: 'البنود والأسعار', icon: Plus },
                { id: 'الخصم والضريبة', label: 'الخصم والضريبة', icon: Percent },
                { id: 'الدفعات والشروط', label: 'الدفعات والشروط', icon: ShieldCheck },
              ].map((sec, index) => {
                const Icon = sec.icon
                return (
                  <button
                    key={sec.id}
                    className={selectedSection === sec.id ? 'active' : ''}
                    onClick={() => setSelectedSection(sec.id)}
                  >
                    <span className="section-number">{index + 1}</span>
                    <Icon size={14} className="section-icon" />
                    <span className="section-label-text">{sec.label}</span>
                  </button>
                )
              })}
            </div>
            <div className="form-fields">
              <h2>{selectedSection}</h2>
              {selectedSection === 'بيانات العرض' && (
                <div className="editor-section-content">
                  <Field
                    label="عنوان العرض"
                    value={activeQuote.title}
                    onChange={(value) => updateQuote(activeQuote.id, { title: value })}
                    placeholder="مثال: تطوير متجر إلكتروني متكامل"
                  />
                  <div className="field-pair">
                    <Field
                      label="رقم العرض"
                      value={activeQuote.number}
                      onChange={(value) => updateQuote(activeQuote.id, { number: value })}
                    />
                    <label className="field">
                      <span>حالة العرض</span>
                      <select
                        className="apple-select-input"
                        value={activeQuote.status}
                        onChange={(e) =>
                          updateQuote(activeQuote.id, { status: e.target.value as QuoteStatus })
                        }
                      >
                        {QUOTE_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="field-pair">
                    <Field
                      label="تاريخ الإصدار"
                      value={activeQuote.updatedAt}
                      onChange={(value) => updateQuote(activeQuote.id, { updatedAt: value })}
                    />
                    <label className="field">
                      <span>مدة الصلاحية</span>
                      <div className="pill-selector">
                        {[7, 15, 30, 60].map((days) => (
                          <button
                            type="button"
                            key={days}
                            className={`pill-choice ${(activeQuote.termsInfo?.validityDays ?? 15) === days ? 'active' : ''}`}
                            onClick={() =>
                              updateQuote(activeQuote.id, {
                                termsInfo: {
                                  ...(activeQuote.termsInfo ?? {
                                    terms: [...DEFAULT_TERMS],
                                    validityDays: 15,
                                  }),
                                  validityDays: days,
                                },
                              })
                            }
                          >
                            {days} يومًا
                          </button>
                        ))}
                      </div>
                    </label>
                  </div>
                  <Field
                    label="نطاق العمل والملخص العام"
                    value={activeQuote.summary ?? ''}
                    onChange={(value) => updateQuote(activeQuote.id, { summary: value })}
                    placeholder="وصف موجز للمشروع وأهدافه الرئيسية..."
                    multiline
                  />
                  <div className="field">
                    <span>اللون المميز للقالب</span>
                    <div className="color-palette-row">
                      {[
                        { color: '#243f5b', label: 'كحلي' },
                        { color: '#007aff', label: 'أزرق' },
                        { color: '#af52de', label: 'بنفسجي' },
                        { color: '#8e6742', label: 'نحاسي' },
                        { color: '#315c50', label: 'زمردي' },
                        { color: '#34c759', label: 'أخضر' },
                        { color: '#ff9500', label: 'برتقالي' },
                      ].map((c) => (
                        <button
                          key={c.color}
                          type="button"
                          className={`color-swatch-btn ${activeQuote.accent === c.color ? 'active' : ''}`}
                          style={{ backgroundColor: c.color }}
                          title={c.label}
                          onClick={() => updateQuote(activeQuote.id, { accent: c.color })}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {selectedSection === 'العميل والمشروع' && (
                <div className="editor-section-content">
                  <Field
                    label="اسم العميل أو الجهة (مطلوب)"
                    value={activeQuote.client}
                    onChange={(value) =>
                      updateQuote(activeQuote.id, {
                        client: value,
                        clientInfo: {
                          ...(activeQuote.clientInfo ?? { name: value }),
                          name: value,
                        },
                      })
                    }
                    placeholder="اكتب اسم العميل أو الشركة"
                  />
                  <div className="field-pair">
                    <Field
                      label="الشخص المسؤول / جهة الاتصال"
                      value={activeQuote.clientInfo?.contactPerson ?? ''}
                      onChange={(value) =>
                        updateQuote(activeQuote.id, {
                          clientInfo: {
                            ...(activeQuote.clientInfo ?? { name: activeQuote.client }),
                            contactPerson: value,
                          },
                        })
                      }
                      placeholder="م. فهد السالم"
                    />
                    <Field
                      label="رقم الجوال / الهاتف"
                      value={activeQuote.clientInfo?.phone ?? ''}
                      onChange={(value) =>
                        updateQuote(activeQuote.id, {
                          clientInfo: {
                            ...(activeQuote.clientInfo ?? { name: activeQuote.client }),
                            phone: value,
                          },
                        })
                      }
                      placeholder="05xxxxxxxx"
                    />
                  </div>
                  <div className="field-pair">
                    <Field
                      label="البريد الإلكتروني"
                      value={activeQuote.clientInfo?.email ?? ''}
                      onChange={(value) =>
                        updateQuote(activeQuote.id, {
                          clientInfo: {
                            ...(activeQuote.clientInfo ?? { name: activeQuote.client }),
                            email: value,
                          },
                        })
                      }
                      placeholder="client@example.com"
                    />
                    <Field
                      label="المدينة أو العنوان"
                      value={activeQuote.clientInfo?.address ?? ''}
                      onChange={(value) =>
                        updateQuote(activeQuote.id, {
                          clientInfo: {
                            ...(activeQuote.clientInfo ?? { name: activeQuote.client }),
                            address: value,
                          },
                        })
                      }
                      placeholder="الرياض — طريق الملك فهد"
                    />
                  </div>
                  <div className="field-pair">
                    <Field
                      label="الرقم الضريبي (إن وجد)"
                      value={activeQuote.clientInfo?.taxNumber ?? ''}
                      onChange={(value) =>
                        updateQuote(activeQuote.id, {
                          clientInfo: {
                            ...(activeQuote.clientInfo ?? { name: activeQuote.client }),
                            taxNumber: value,
                          },
                        })
                      }
                      placeholder="310xxxxxxxxxxxx (15 رقم)"
                    />
                    <Field
                      label="السجل التجاري (إن وجد)"
                      value={activeQuote.clientInfo?.crNumber ?? ''}
                      onChange={(value) =>
                        updateQuote(activeQuote.id, {
                          clientInfo: {
                            ...(activeQuote.clientInfo ?? { name: activeQuote.client }),
                            crNumber: value,
                          },
                        })
                      }
                      placeholder="1010xxxxxx"
                    />
                  </div>
                </div>
              )}
              {selectedSection === 'البنود والأسعار' && (
                <div className="editor-section-content">
                  <p className="field-hint">
                    أضف تفاصيل البنود. تتحدث الإجماليات والمعاينة فورًا.
                  </p>
                  <div className="item-edit-list">
                    {activeQuote.items.map((item, index) => {
                      const itemTotal = (item.quantity || 0) * (item.unitPrice || 0)
                      return (
                        <div className="item-edit-wrap" key={item.id}>
                          {index > 0 && item.pageBreakBefore && (
                            <div className="manual-break-indicator">
                              <Scissors size={12} />
                              <span>فاصل صفحة يدوي — يبدأ هذا البند في صفحة A4 جديدة</span>
                              <button
                                type="button"
                                onClick={() => updateItem(item.id, { pageBreakBefore: false })}
                              >
                                إلغاء الفاصل
                              </button>
                            </div>
                          )}
                          <div className="item-edit">
                            <div className="item-edit-header">
                              <span className="item-number">{index + 1}</span>
                              <input
                                className="item-title-field"
                                aria-label="عنوان البند"
                                placeholder="عنوان الخدمة أو السلعة..."
                                value={item.title}
                                onChange={(e) => updateItem(item.id, { title: e.target.value })}
                              />
                              <span className="item-total-badge">{formatMoney(itemTotal)}</span>
                              <div className="item-row-actions">
                                {index > 0 && (
                                  <button
                                    type="button"
                                    className={item.pageBreakBefore ? 'active-break-btn' : ''}
                                    aria-label="فاصل صفحة قبل البند"
                                    title={
                                      item.pageBreakBefore
                                        ? 'إلغاء فاصل الصفحة قبل هذا البند'
                                        : 'بدء صفحة A4 جديدة قبل هذا البند'
                                    }
                                    onClick={() =>
                                      updateItem(item.id, {
                                        pageBreakBefore: !item.pageBreakBefore,
                                      })
                                    }
                                  >
                                    <Scissors size={13} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  aria-label="تكرار البند"
                                  title="تكرار هذا البند"
                                  onClick={() => {
                                    const newItem = {
                                      ...item,
                                      id: makeId(),
                                      title: `${item.title || 'بند'} (نسخة)`,
                                      pageBreakBefore: false,
                                    }
                                    const list = [...activeQuote.items]
                                    list.splice(index + 1, 0, newItem)
                                    updateQuote(activeQuote.id, { items: list })
                                  }}
                                >
                                  <Copy size={13} />
                                </button>
                                <button
                                  type="button"
                                  aria-label="رفع البند"
                                  disabled={index === 0}
                                  title="تحريك للأعلى"
                                  onClick={() => {
                                    const list = [...activeQuote.items]
                                    if (index > 0) {
                                      ;[list[index - 1], list[index]] = [
                                        list[index],
                                        list[index - 1],
                                      ]
                                      updateQuote(activeQuote.id, { items: list })
                                    }
                                  }}
                                >
                                  <ArrowUp size={14} />
                                </button>
                                <button
                                  type="button"
                                  aria-label="خفض البند"
                                  disabled={index === activeQuote.items.length - 1}
                                  title="تحريك للأسفل"
                                  onClick={() => {
                                    const list = [...activeQuote.items]
                                    if (index < list.length - 1) {
                                      ;[list[index + 1], list[index]] = [
                                        list[index],
                                        list[index + 1],
                                      ]
                                      updateQuote(activeQuote.id, { items: list })
                                    }
                                  }}
                                >
                                  <ArrowDown size={14} />
                                </button>
                                <button
                                  type="button"
                                  aria-label="حذف البند"
                                  title="حذف البند"
                                  onClick={() => {
                                    if (activeQuote.items.length <= 1) {
                                      updateQuote(activeQuote.id, {
                                        items: [
                                          { id: makeId(), title: '', quantity: 1, unitPrice: 0 },
                                        ],
                                      })
                                    } else {
                                      updateQuote(activeQuote.id, {
                                        items: activeQuote.items.filter(
                                          (row) => row.id !== item.id,
                                        ),
                                      })
                                    }
                                  }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            <textarea
                              className="item-desc-field"
                              rows={2}
                              aria-label="وصف البند"
                              placeholder="مواصفات وتفاصيل البند (اختياري)..."
                              value={item.description ?? ''}
                              onChange={(e) =>
                                updateItem(item.id, { description: e.target.value })
                              }
                            />
                            <div className="item-numbers">
                              <label>
                                <small>الكمية</small>
                                <input
                                  type="number"
                                  min="0.1"
                                  step="1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    updateItem(item.id, {
                                      quantity: Math.max(0, Number(e.target.value) || 0),
                                    })
                                  }
                                />
                              </label>
                              <label>
                                <small>سعر الوحدة (SAR)</small>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.unitPrice}
                                  onChange={(e) =>
                                    updateItem(item.id, {
                                      unitPrice: Math.max(0, Number(e.target.value) || 0),
                                    })
                                  }
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="items-bottom-row">
                    <button
                      className="add-item-button"
                      onClick={() =>
                        updateQuote(activeQuote.id, {
                          items: [
                            ...activeQuote.items,
                            { id: makeId(), title: '', description: '', quantity: 1, unitPrice: 0 },
                          ],
                        })
                      }
                    >
                      <Plus size={15} />
                      إضافة بند جديد
                    </button>
                    <span className="items-subtotal-txt">
                      المجموع الفرعي ({activeQuote.items.length} بنود):{' '}
                      <b>{formatMoney(quoteCalc.subtotal)}</b>
                    </span>
                  </div>
                </div>
              )}
              {selectedSection === 'الخصم والضريبة' && (
                <div className="editor-section-content">
                  <div className="editor-group-card">
                    <span className="field-group-title">الخصم التجاري</span>
                    <div className="pill-selector">
                      <button
                        type="button"
                        className={`pill-choice ${(activeQuote.moneyRules?.discountType ?? 'amount') === 'amount' && !activeQuote.moneyRules?.discountAmount ? 'active' : ''}`}
                        onClick={() =>
                          updateQuote(activeQuote.id, {
                            moneyRules: {
                              ...(activeQuote.moneyRules ?? {
                                currency: 'SAR',
                                fractionDigits: 2,
                                taxRate: 0,
                                discountAmount: 0,
                              }),
                              discountType: 'amount',
                              discountAmount: 0,
                              discountPercent: 0,
                            },
                          })
                        }
                      >
                        بدون خصم
                      </button>
                      <button
                        type="button"
                        className={`pill-choice ${(activeQuote.moneyRules?.discountType ?? 'amount') === 'amount' && (activeQuote.moneyRules?.discountAmount ?? 0) > 0 ? 'active' : ''}`}
                        onClick={() =>
                          updateQuote(activeQuote.id, {
                            moneyRules: {
                              ...(activeQuote.moneyRules ?? {
                                currency: 'SAR',
                                fractionDigits: 2,
                                taxRate: 0,
                                discountAmount: 0,
                              }),
                              discountType: 'amount',
                            },
                          })
                        }
                      >
                        مبلغ ثابت (SAR)
                      </button>
                      <button
                        type="button"
                        className={`pill-choice ${activeQuote.moneyRules?.discountType === 'percent' ? 'active' : ''}`}
                        onClick={() =>
                          updateQuote(activeQuote.id, {
                            moneyRules: {
                              ...(activeQuote.moneyRules ?? {
                                currency: 'SAR',
                                fractionDigits: 2,
                                taxRate: 0,
                                discountAmount: 0,
                              }),
                              discountType: 'percent',
                            },
                          })
                        }
                      >
                        نسبة مئوية (%)
                      </button>
                    </div>

                    {activeQuote.moneyRules?.discountType === 'percent' ? (
                      <label className="field" style={{ marginTop: '12px' }}>
                        <span>نسبة الخصم المئوية (%)</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={activeQuote.moneyRules?.discountPercent ?? 0}
                          onChange={(e) =>
                            updateQuote(activeQuote.id, {
                              moneyRules: {
                                ...(activeQuote.moneyRules ?? {
                                  currency: 'SAR',
                                  fractionDigits: 2,
                                  taxRate: 0,
                                  discountAmount: 0,
                                }),
                                discountType: 'percent',
                                discountPercent: Math.min(
                                  100,
                                  Math.max(0, Number(e.target.value) || 0),
                                ),
                              },
                            })
                          }
                        />
                      </label>
                    ) : (
                      <label className="field" style={{ marginTop: '12px' }}>
                        <span>قيمة الخصم المالي (SAR)</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={activeQuote.moneyRules?.discountAmount ?? 0}
                          onChange={(e) =>
                            updateQuote(activeQuote.id, {
                              moneyRules: {
                                ...(activeQuote.moneyRules ?? {
                                  currency: 'SAR',
                                  fractionDigits: 2,
                                  taxRate: 0,
                                  discountAmount: 0,
                                }),
                                discountType: 'amount',
                                discountAmount: Math.max(0, Number(e.target.value) || 0),
                              },
                            })
                          }
                        />
                      </label>
                    )}
                  </div>

                  <div className="editor-group-card">
                    <span className="field-group-title">ضريبة القيمة المضافة (VAT)</span>
                    <div className="pill-selector">
                      <button
                        type="button"
                        className={`pill-choice ${(activeQuote.moneyRules?.taxRate ?? 0) === 15 ? 'active' : ''}`}
                        onClick={() =>
                          updateQuote(activeQuote.id, {
                            moneyRules: {
                              ...(activeQuote.moneyRules ?? {
                                currency: 'SAR',
                                fractionDigits: 2,
                                taxRate: 0,
                                discountAmount: 0,
                              }),
                              taxRate: 15,
                            },
                          })
                        }
                      >
                        15% (الضريبة القياسية في السعودية)
                      </button>
                      <button
                        type="button"
                        className={`pill-choice ${(activeQuote.moneyRules?.taxRate ?? 0) === 0 ? 'active' : ''}`}
                        onClick={() =>
                          updateQuote(activeQuote.id, {
                            moneyRules: {
                              ...(activeQuote.moneyRules ?? {
                                currency: 'SAR',
                                fractionDigits: 2,
                                taxRate: 0,
                                discountAmount: 0,
                              }),
                              taxRate: 0,
                            },
                          })
                        }
                      >
                        0% (معفى من الضريبة)
                      </button>
                    </div>
                    {(activeQuote.moneyRules?.taxRate ?? 0) !== 15 &&
                      (activeQuote.moneyRules?.taxRate ?? 0) !== 0 && (
                        <label className="field" style={{ marginTop: '12px' }}>
                          <span>نسبة ضريبة مخصصة (%)</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={activeQuote.moneyRules?.taxRate ?? 0}
                            onChange={(e) =>
                              updateQuote(activeQuote.id, {
                                moneyRules: {
                                  ...(activeQuote.moneyRules ?? {
                                    currency: 'SAR',
                                    fractionDigits: 2,
                                    taxRate: 0,
                                    discountAmount: 0,
                                  }),
                                  taxRate: Math.max(0, Number(e.target.value) || 0),
                                },
                              })
                            }
                          />
                        </label>
                      )}
                  </div>

                  <div className="totals-summary-card">
                    <div className="totals-row">
                      <span>المجموع الفرعي</span>
                      <b>{formatMoney(quoteCalc.subtotal)}</b>
                    </div>
                    {quoteCalc.discount > 0 && (
                      <div className="totals-row discount-row">
                        <span>الخصم</span>
                        <b>- {formatMoney(quoteCalc.discount)}</b>
                      </div>
                    )}
                    <div className="totals-row">
                      <span>المبلغ الخاضع للضريبة</span>
                      <b>{formatMoney(quoteCalc.taxableAmount)}</b>
                    </div>
                    <div className="totals-row">
                      <span>ضريبة القيمة المضافة ({quoteCalc.taxRate}%)</span>
                      <b>{formatMoney(quoteCalc.tax)}</b>
                    </div>
                    <div className="totals-row grand-total-row">
                      <span>الإجمالي النهائي</span>
                      <b>{formatMoney(quoteCalc.total)}</b>
                    </div>
                  </div>
                </div>
              )}
              {selectedSection === 'الدفعات والشروط' && (
                <div className="editor-section-content">
                  {/* Payment Schedule */}
                  <div className="editor-group-card">
                    <div className="group-header-with-actions">
                      <span className="field-group-title">جدول الدفعات والمراحل</span>
                      <div className="quick-presets">
                        <button
                          type="button"
                          className="preset-btn"
                          onClick={() => {
                            const ms = [
                              {
                                id: makeId(),
                                name: 'الدفعة الأولى — عند توقيع العقد',
                                percentage: 50,
                                amount: 0,
                              },
                              {
                                id: makeId(),
                                name: 'الدفعة الختامية — عند التسليم',
                                percentage: 50,
                                amount: 0,
                              },
                            ]
                            updateQuote(activeQuote.id, {
                              paymentSchedule: balancePaymentMilestones(quoteCalc.total, ms),
                            })
                          }}
                        >
                          50% / 50%
                        </button>
                        <button
                          type="button"
                          className="preset-btn"
                          onClick={() => {
                            const ms = [
                              {
                                id: makeId(),
                                name: 'دفعة انطلاق وبدء العمل',
                                percentage: 40,
                                amount: 0,
                              },
                              {
                                id: makeId(),
                                name: 'دفعة اعتماد المسودة الأولية',
                                percentage: 40,
                                amount: 0,
                              },
                              {
                                id: makeId(),
                                name: 'دفعة ختامية عند التسليم',
                                percentage: 20,
                                amount: 0,
                              },
                            ]
                            updateQuote(activeQuote.id, {
                              paymentSchedule: balancePaymentMilestones(quoteCalc.total, ms),
                            })
                          }}
                        >
                          40% / 40% / 20%
                        </button>
                      </div>
                    </div>

                    <div className="milestones-list">
                      {(activeQuote.paymentSchedule ?? []).map((ms, idx) => (
                        <div className="milestone-edit-row" key={ms.id}>
                          <span className="milestone-num">{idx + 1}</span>
                          <input
                            className="milestone-name-input"
                            value={ms.name}
                            placeholder="وصف مرحلة الدفع..."
                            onChange={(e) => {
                              const list = (activeQuote.paymentSchedule ?? []).map((m) =>
                                m.id === ms.id ? { ...m, name: e.target.value } : m,
                              )
                              updateQuote(activeQuote.id, { paymentSchedule: list })
                            }}
                          />
                          <div className="milestone-perc-wrap">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={ms.percentage}
                              onChange={(e) => {
                                const perc = Math.min(
                                  100,
                                  Math.max(0, Number(e.target.value) || 0),
                                )
                                const list = (activeQuote.paymentSchedule ?? []).map((m) =>
                                  m.id === ms.id ? { ...m, percentage: perc } : m,
                                )
                                updateQuote(activeQuote.id, {
                                  paymentSchedule: balancePaymentMilestones(quoteCalc.total, list),
                                })
                              }}
                            />
                            <span>%</span>
                          </div>
                          <span className="milestone-amount-preview">{formatMoney(ms.amount)}</span>
                          <button
                            type="button"
                            className="icon-button-subtle danger"
                            onClick={() => {
                              const list = (activeQuote.paymentSchedule ?? []).filter(
                                (m) => m.id !== ms.id,
                              )
                              updateQuote(activeQuote.id, {
                                paymentSchedule: balancePaymentMilestones(quoteCalc.total, list),
                              })
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="milestone-actions-bar">
                      <button
                        type="button"
                        className="button outline-button btn-sm"
                        onClick={() => {
                          const list = [
                            ...(activeQuote.paymentSchedule ?? []),
                            { id: makeId(), name: 'مرحلة دفع جديدة', percentage: 0, amount: 0 },
                          ]
                          updateQuote(activeQuote.id, { paymentSchedule: list })
                        }}
                      >
                        <Plus size={14} />
                        إضافة مرحلة دفع
                      </button>
                      <button
                        type="button"
                        className="button outline-button btn-sm"
                        onClick={() => {
                          if (
                            activeQuote.paymentSchedule &&
                            activeQuote.paymentSchedule.length > 0
                          ) {
                            updateQuote(activeQuote.id, {
                              paymentSchedule: balancePaymentMilestones(
                                quoteCalc.total,
                                activeQuote.paymentSchedule,
                              ),
                            })
                            setToast('تمت موازنة مبالغ الدفعات مع الإجمالي الحالي')
                          }
                        }}
                      >
                        <RefreshCw size={13} />
                        موازنة المبالغ مع الإجمالي
                      </button>
                    </div>
                  </div>

                  {/* Bank Info */}
                  <div className="editor-group-card">
                    <span className="field-group-title">معلومات الحساب البنكي</span>
                    <div className="field-pair">
                      <Field
                        label="اسم البنك"
                        value={activeQuote.termsInfo?.bankInfo?.bankName ?? ''}
                        placeholder="مثال: مصرف الراجحي"
                        onChange={(val) =>
                          updateQuote(activeQuote.id, {
                            termsInfo: {
                              ...(activeQuote.termsInfo ?? {
                                validityDays: 15,
                                terms: [...DEFAULT_TERMS],
                              }),
                              bankInfo: {
                                bankName: val,
                                accountName: activeQuote.termsInfo?.bankInfo?.accountName ?? '',
                                iban: activeQuote.termsInfo?.bankInfo?.iban ?? '',
                              },
                            },
                          })
                        }
                      />
                      <Field
                        label="اسم صاحب الحساب"
                        value={activeQuote.termsInfo?.bankInfo?.accountName ?? ''}
                        placeholder="اسم المنشأة أو المستفيد"
                        onChange={(val) =>
                          updateQuote(activeQuote.id, {
                            termsInfo: {
                              ...(activeQuote.termsInfo ?? {
                                validityDays: 15,
                                terms: [...DEFAULT_TERMS],
                              }),
                              bankInfo: {
                                bankName: activeQuote.termsInfo?.bankInfo?.bankName ?? '',
                                accountName: val,
                                iban: activeQuote.termsInfo?.bankInfo?.iban ?? '',
                              },
                            },
                          })
                        }
                      />
                    </div>
                    <Field
                      label="رقم الآيبان (IBAN)"
                      value={activeQuote.termsInfo?.bankInfo?.iban ?? ''}
                      placeholder="SA..."
                      onChange={(val) =>
                        updateQuote(activeQuote.id, {
                          termsInfo: {
                            ...(activeQuote.termsInfo ?? {
                              validityDays: 15,
                              terms: [...DEFAULT_TERMS],
                            }),
                            bankInfo: {
                              bankName: activeQuote.termsInfo?.bankInfo?.bankName ?? '',
                              accountName: activeQuote.termsInfo?.bankInfo?.accountName ?? '',
                              iban: val,
                            },
                          },
                        })
                      }
                    />
                  </div>

                  {/* Terms & Conditions */}
                  <div className="editor-group-card">
                    <div className="group-header-with-actions">
                      <span className="field-group-title">الشروط والأحكام</span>
                      <button
                        type="button"
                        className="preset-btn"
                        onClick={() =>
                          updateQuote(activeQuote.id, {
                            termsInfo: {
                              ...(activeQuote.termsInfo ?? { validityDays: 15 }),
                              terms: [...DEFAULT_TERMS],
                            },
                          })
                        }
                      >
                        استعادة الشروط الافتراضية
                      </button>
                    </div>
                    <div className="terms-edit-list">
                      {(activeQuote.termsInfo?.terms ?? DEFAULT_TERMS).map((term, tIdx) => (
                        <div className="term-edit-row" key={tIdx}>
                          <span className="term-idx-badge">{tIdx + 1}</span>
                          <input
                            className="term-input"
                            value={term}
                            onChange={(e) => {
                              const currentTerms = [
                                ...(activeQuote.termsInfo?.terms ?? DEFAULT_TERMS),
                              ]
                              currentTerms[tIdx] = e.target.value
                              updateQuote(activeQuote.id, {
                                termsInfo: {
                                  ...(activeQuote.termsInfo ?? { validityDays: 15 }),
                                  terms: currentTerms,
                                },
                              })
                            }}
                          />
                          <button
                            type="button"
                            className="icon-button-subtle danger"
                            onClick={() => {
                              const currentTerms = (
                                activeQuote.termsInfo?.terms ?? DEFAULT_TERMS
                              ).filter((_, i) => i !== tIdx)
                              updateQuote(activeQuote.id, {
                                termsInfo: {
                                  ...(activeQuote.termsInfo ?? { validityDays: 15 }),
                                  terms: currentTerms,
                                },
                              })
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="button outline-button btn-sm"
                      style={{ marginTop: '10px' }}
                      onClick={() => {
                        const currentTerms = [
                          ...(activeQuote.termsInfo?.terms ?? DEFAULT_TERMS),
                          '',
                        ]
                        updateQuote(activeQuote.id, {
                          termsInfo: {
                            ...(activeQuote.termsInfo ?? { validityDays: 15 }),
                            terms: currentTerms,
                          },
                        })
                      }}
                    >
                      <Plus size={14} />
                      إضافة شرط جديد
                    </button>
                  </div>

                  {/* Notes */}
                  <div className="editor-group-card">
                    <span className="field-group-title">ملاحظات ختامية للوثيقة</span>
                    <textarea
                      className="apple-textarea"
                      rows={3}
                      placeholder="ملاحظات ختامية أو شكر للعميل..."
                      value={activeQuote.termsInfo?.notes ?? ''}
                      onChange={(e) =>
                        updateQuote(activeQuote.id, {
                          termsInfo: {
                            ...(activeQuote.termsInfo ?? {
                              validityDays: 15,
                              terms: [...DEFAULT_TERMS],
                            }),
                            notes: e.target.value,
                          },
                        })
                      }
                    />
                  </div>

                  {/* A4 Page Distribution & Manual Breaks */}
                  <div className="editor-group-card">
                    <span className="field-group-title">
                      إعدادات توزيع صفحات A4 والفواصل اليدوية
                    </span>
                    <div className="page-break-options-list">
                      <label className="check-option">
                        <input
                          type="checkbox"
                          checked={paginatedDoc.settings.repeatTableHeader}
                          onChange={(e) =>
                            updatePageSettings({ repeatTableHeader: e.target.checked })
                          }
                        />
                        <span>
                          تكرار ترويسة جدول الأسعار تلقائيًا عند امتداد البنود لصفحة تالية
                        </span>
                      </label>
                      <label className="check-option">
                        <input
                          type="checkbox"
                          checked={Boolean(paginatedDoc.settings.breakBeforeMilestones)}
                          onChange={(e) =>
                            updatePageSettings({ breakBeforeMilestones: e.target.checked })
                          }
                        />
                        <span>بدء جدول الدفعات والمراحل في صفحة A4 جديدة</span>
                      </label>
                      <label className="check-option">
                        <input
                          type="checkbox"
                          checked={Boolean(paginatedDoc.settings.breakBeforeTerms)}
                          onChange={(e) =>
                            updatePageSettings({ breakBeforeTerms: e.target.checked })
                          }
                        />
                        <span>بدء بيانات التحويل والشروط التعاقدية في صفحة A4 جديدة</span>
                      </label>
                      <label className="check-option">
                        <input
                          type="checkbox"
                          checked={Boolean(paginatedDoc.settings.breakBeforeSignatures)}
                          onChange={(e) =>
                            updatePageSettings({ breakBeforeSignatures: e.target.checked })
                          }
                        />
                        <span>بدء قسم الاعتماد والتوقيع الرسمي في صفحة A4 جديدة</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
        <section className="preview-workarea">
          <div className="preview-toolbar no-print">
            <div className="preview-toolbar-right">
              <b>معاينة صفحات A4 الحية</b>
              <small>
                {paginatedDoc.totalPages === 1
                  ? 'صفحة A4 واحدة · تتحدث فورًا'
                  : `${paginatedDoc.totalPages} صفحات A4 · توزيع وتكرار ترويسات تلقائي`}
              </small>
            </div>

            <div className="preview-toolbar-controls">
              <div className="margin-preset-pills" role="group" aria-label="هوامش الصفحة">
                {(
                  [
                    { id: 'compact', label: 'مضغوط' },
                    { id: 'normal', label: 'قياسي' },
                    { id: 'spacious', label: 'واسع' },
                  ] as Array<{ id: MarginPreset; label: string }>
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={paginatedDoc.settings.marginPreset === m.id ? 'active' : ''}
                    onClick={() => updatePageSettings({ marginPreset: m.id })}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="zoom-controls" role="group" aria-label="مستوى التكبير">
                <button
                  type="button"
                  className="icon-button"
                  aria-label="تصغير المعاينة"
                  onClick={() => setPreviewZoom((z) => Math.max(80, z - 10))}
                >
                  <ZoomOut size={15} />
                </button>
                <span className="zoom-label ltr-num">{previewZoom}%</span>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="تكبير المعاينة"
                  onClick={() => setPreviewZoom((z) => Math.min(125, z + 10))}
                >
                  <ZoomIn size={15} />
                </button>
              </div>

              <button
                type="button"
                className="toolbar-print-chip"
                onClick={handlePrintPdf}
                title="طباعة أو حفظ كملف PDF"
              >
                <Printer size={13} />
                <span>PDF</span>
              </button>
            </div>
          </div>

          {paginatedDoc.warnings.length > 0 && (
            <div
              className="doc-warnings-bar no-print"
              role="region"
              aria-label="تنبيهات واقتراحات الوثيقة"
            >
              {paginatedDoc.warnings.slice(0, 2).map((warn) => (
                <div className={`doc-warning-item ${warn.severity}`} key={warn.id}>
                  <AlertCircle size={14} className="warn-icon" />
                  <div className="warn-text">
                    <b>{warn.title}:</b> <span>{warn.message}</span>
                  </div>
                  {warn.suggestionLabel && (
                    <button
                      type="button"
                      className="warn-action-btn"
                      onClick={() => handleWarningAction(warn)}
                    >
                      {warn.suggestionLabel}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="a4-stage" ref={a4StageRef}>
            <QuoteDocument quote={activeQuote} paginated={paginatedDoc} zoom={previewZoom} />
          </div>

          <div className="page-controls no-print">
            <button
              type="button"
              aria-label="الصفحة السابقة"
              disabled={currentPreviewPage <= 1}
              onClick={() => scrollToPreviewPage(currentPreviewPage - 1)}
            >
              <ChevronRight size={16} />
            </button>
            <span>
              صفحة {currentPreviewPage} من {paginatedDoc.totalPages}
            </span>
            <button
              type="button"
              aria-label="الصفحة التالية"
              disabled={currentPreviewPage >= paginatedDoc.totalPages}
              onClick={() => scrollToPreviewPage(currentPreviewPage + 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="page-control-note">
              {paginatedDoc.totalPages > 1 ? 'توزيع صفحات متعدد' : 'تقسيم تلقائي'}
            </span>
          </div>
        </section>
      </div>
    </main>
  )
}
