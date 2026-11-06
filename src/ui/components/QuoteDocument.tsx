import React, { useMemo } from 'react'
import { paginateQuoteDocument, type PaginatedQuoteDocument } from '../../domain/pagination'
import { DEFAULT_TERMS, calculateQuote, formatMoney, type Quote } from '../../domain/quote'
import { getExecutivePalette } from '../types'

export function QuoteDocument({
  quote,
  paginated,
  zoom = 100,
}: {
  quote: Quote
  paginated?: PaginatedQuoteDocument
  zoom?: number
}) {
  const doc = useMemo(() => paginated ?? paginateQuoteDocument(quote), [paginated, quote])
  const calc = calculateQuote(quote)
  const validityDays = quote.termsInfo?.validityDays ?? 15
  const clientName = quote.client || quote.clientInfo?.name || 'العميل المحترم'
  const palette = getExecutivePalette(quote.accent)
  const hasMilestones = Boolean(quote.paymentSchedule && quote.paymentSchedule.length > 0)
  const hasBankInfo = Boolean(
    quote.termsInfo?.bankInfo?.iban ||
      quote.termsInfo?.bankInfo?.bankName ||
      quote.termsInfo?.bankInfo?.accountName,
  )
  const termsList = quote.termsInfo?.terms ?? DEFAULT_TERMS

  return (
    <div
      className="a4-pages-stack"
      style={zoom !== 100 ? ({ zoom: `${zoom}%` } as React.CSSProperties) : undefined}
    >
      {doc.pages.map((page) => {
        const showTableHeader = page.isFirstPage || doc.settings.repeatTableHeader
        return (
          <article
            key={page.pageNumber}
            data-page-number={page.pageNumber}
            className={`quote-document a4-page-sheet margin-${doc.settings.marginPreset}`}
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
            {page.isFirstPage ? (
              /* Full-Bleed Executive Header Banner on Page 1 */
              <header className="exec-header-banner">
                <div className="exec-banner-right">
                  <div className="exec-brand-strip">
                    <span className="exec-emblem">ط</span>
                    <span className="exec-brand-name">طِرَاس</span>
                    <span className="exec-brand-sep">·</span>
                    <span className="exec-template-tag">وثيقة نطاق العمل وعرض السعر</span>
                    <span className="exec-status-pill">{quote.status}</span>
                  </div>
                  <h1 className="exec-doc-title">
                    {quote.title || 'وثيقة نطاق العمل وعرض السعر الفني والمالي'}
                  </h1>
                  <p className="exec-doc-subtitle">
                    عرض سعر رسمي ومفصّل مقدم إلى: <strong>{clientName}</strong>
                  </p>
                </div>

                <div className="exec-banner-meta-box">
                  <div className="exec-meta-line">
                    <span>رقم الوثيقة:</span>
                    <strong className="ltr-num">{quote.number}</strong>
                  </div>
                  <div className="exec-meta-line">
                    <span>تاريخ الإصدار:</span>
                    <strong className="ltr-num">{quote.updatedAt}</strong>
                  </div>
                  <div className="exec-meta-line">
                    <span>مدة الصلاحية:</span>
                    <strong>{validityDays} يومًا من تاريخه</strong>
                  </div>
                </div>
              </header>
            ) : (
              /* Continuation Header Banner on Page 2+ */
              <header className="exec-continuation-banner">
                <div className="exec-cont-right">
                  <span className="exec-emblem">أ</span>
                  <div>
                    <strong>{quote.title || 'وثيقة عرض السعر'}</strong>
                    <span>تابع العرض المقدم إلى: {clientName}</span>
                  </div>
                </div>
                <div className="exec-cont-meta">
                  <span className="ltr-num">{quote.number}</span>
                  <span className="exec-cont-sep">|</span>
                  <span>
                    صفحة {page.pageNumber} من {page.totalPages}
                  </span>
                </div>
              </header>
            )}

            <div className="exec-document-body">
              {/* Page 1 Only: Parties Grid & Executive Scope Summary */}
              {page.isFirstPage && (
                <>
                  <section
                    className="exec-parties-grid"
                    aria-label="أطراف العرض والبيانات المرجعية"
                  >
                    <div className="exec-party-card">
                      <span className="exec-party-label">الطرف الأول (مقدم العرض / المنفذ):</span>
                      <strong className="exec-party-name">
                        استوديو طِرَاس للحلول الإبداعية والتقنية
                      </strong>
                      <span className="exec-party-sub">
                        قالب: {quote.templateSnapshot.name} · العملة: ريال سعودي (SAR)
                      </span>
                    </div>

                    <div className="exec-party-card highlight-client">
                      <span className="exec-party-label">
                        الطرف الثاني (العميل / الجهة المستفيدة):
                      </span>
                      <strong className="exec-party-name">{clientName}</strong>
                      {quote.clientInfo?.contactPerson ? (
                        <span className="exec-party-sub">
                          عناية: {quote.clientInfo.contactPerson}
                        </span>
                      ) : quote.clientInfo?.address ? (
                        <span className="exec-party-sub">{quote.clientInfo.address}</span>
                      ) : (
                        <span className="exec-party-sub">
                          السادة إدارة {clientName} المحترمين
                        </span>
                      )}
                    </div>

                    <div className="exec-party-card">
                      <span className="exec-party-label">بيانات التواصل والسجل الرسمي:</span>
                      {quote.clientInfo?.phone ||
                      quote.clientInfo?.email ||
                      quote.clientInfo?.taxNumber ||
                      quote.clientInfo?.crNumber ? (
                        <div className="exec-party-contacts">
                          {quote.clientInfo?.phone && (
                            <span>
                              هاتف: <b className="ltr-num">{quote.clientInfo.phone}</b>
                            </span>
                          )}
                          {quote.clientInfo?.email && (
                            <span>
                              بريد: <b className="ltr-num">{quote.clientInfo.email}</b>
                            </span>
                          )}
                          {quote.clientInfo?.taxNumber && (
                            <span>
                              الرقم الضريبي:{' '}
                              <b className="ltr-num">{quote.clientInfo.taxNumber}</b>
                            </span>
                          )}
                          {quote.clientInfo?.crNumber && (
                            <span>
                              س.ت: <b className="ltr-num">{quote.clientInfo.crNumber}</b>
                            </span>
                          )}
                        </div>
                      ) : (
                        <>
                          <strong className="exec-party-name">وثيقة عرض فني ومالي معتمد</strong>
                          <span className="exec-party-sub">
                            {quote.clientInfo?.address ||
                              'خاضع للشروط والجدول الزمني الموضح أدناه'}
                          </span>
                        </>
                      )}
                    </div>
                  </section>

                  <section className="exec-section">
                    <h2 className="exec-section-title">
                      <span className="exec-sec-num">1</span>
                      <span>الملخص التنفيذي ونطاق العمل</span>
                    </h2>
                    <div className="exec-summary-card">
                      <p>
                        {quote.summary ||
                          'يشمل هذا العرض تنفيذ وتوريد البنود والخدمات الموضحة في الجدول المالي أدناه وفق أعلى المعايير المهنية والفنية المعتمدة، مع الالتزام التام بالمواصفات ومراحل التسليم المتفق عليها.'}
                      </p>
                    </div>
                  </section>
                </>
              )}

              {/* Section 2: Pricing & Deliverables Table (or Continuation) */}
              {(page.items.length > 0 || page.showFinancialSummary) && (
                <section className="exec-section">
                  {page.items.length > 0 && (
                    <>
                      <h2 className="exec-section-title">
                        <span className="exec-sec-num">2</span>
                        <span>
                          {page.isTableContinuation
                            ? `تابع جدول التسعيرات والبنود التفصيلية (صفحة ${page.pageNumber})`
                            : 'جدول التسعيرات والبنود التفصيلية'}
                        </span>
                      </h2>
                      <div className="exec-table-wrap">
                        <table className="exec-pricing-table">
                          {showTableHeader && (
                            <thead>
                              <tr>
                                <th className="col-idx">م</th>
                                <th className="col-desc">البند / المرحلة ونطاق العمل المشمول</th>
                                <th className="col-qty">الكمية</th>
                                <th className="col-unit">سعر الوحدة</th>
                                <th className="col-total">الإجمالي</th>
                              </tr>
                            </thead>
                          )}
                          <tbody>
                            {page.items.map(({ item, globalIndex }) => {
                              const lineTotal = item.quantity * item.unitPrice
                              return (
                                <tr key={item.id}>
                                  <td className="col-idx">
                                    <span className="exec-row-badge">{globalIndex}</span>
                                  </td>
                                  <td className="col-desc">
                                    <strong className="exec-item-title">
                                      {item.title || 'بند خدمة أو توريد'}
                                    </strong>
                                    {item.description && (
                                      <span className="exec-item-desc">{item.description}</span>
                                    )}
                                  </td>
                                  <td className="col-qty">
                                    <span className="exec-qty-pill ltr-num">{item.quantity}</span>
                                  </td>
                                  <td className="col-unit">
                                    <span className="ltr-num">
                                      {formatMoney(item.unitPrice)}
                                    </span>
                                  </td>
                                  <td className="col-total">
                                    <strong className="ltr-num">{formatMoney(lineTotal)}</strong>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      {page.hasMoreItemsAfter && (
                        <div className="exec-table-continue-note">
                          <span>
                            يتبع بقية البنود في الصفحة التالية ({page.pageNumber + 1} من{' '}
                            {page.totalPages}) ←
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Executive Financial Totals Summary */}
                  {page.showFinancialSummary && (
                    <div className="exec-financial-summary">
                      <div className="exec-financial-notes">
                        <span className="exec-currency-badge">
                          العملة المعتمدة: الريال السعودي (SAR)
                        </span>
                        <p>
                          {calc.taxRate > 0
                            ? `الأسعار أعلاه خاضعة لضريبة القيمة المضافة بنسبة ${calc.taxRate}% حسب الأنظمة المعمول بها.`
                            : 'الأسعار الموضحة أعلاه صافية ولا تشمل ضريبة القيمة المضافة.'}
                        </p>
                      </div>

                      <div className="exec-totals-box">
                        <div className="exec-totals-line">
                          <span>المجموع الفرعي ({quote.items.length} بنود):</span>
                          <b className="ltr-num">{formatMoney(calc.subtotal)}</b>
                        </div>
                        {calc.discount > 0 && (
                          <div className="exec-totals-line is-discount">
                            <span>
                              الخصم التجاري الممنوح
                              {quote.moneyRules?.discountType === 'percent' &&
                              quote.moneyRules?.discountPercent
                                ? ` (${quote.moneyRules.discountPercent}%)`
                                : ''}
                              :
                            </span>
                            <b className="ltr-num">- {formatMoney(calc.discount)}</b>
                          </div>
                        )}
                        {calc.taxRate > 0 && (
                          <>
                            <div className="exec-totals-line">
                              <span>الصافي الخاضع للضريبة:</span>
                              <b className="ltr-num">{formatMoney(calc.taxableAmount)}</b>
                            </div>
                            <div className="exec-totals-line">
                              <span>ضريبة القيمة المضافة ({calc.taxRate}%):</span>
                              <b className="ltr-num">{formatMoney(calc.tax)}</b>
                            </div>
                          </>
                        )}
                        <div className="exec-grand-total-bar">
                          <span>الإجمالي الكلي للمشروع:</span>
                          <strong className="ltr-num">{formatMoney(calc.total)}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Section 3: Payment Milestones */}
              {page.showMilestones && hasMilestones && (
                <section className="exec-section">
                  <h2 className="exec-section-title">
                    <span className="exec-sec-num">3</span>
                    <span>جدولة الدفعات المالية والمراحل</span>
                  </h2>
                  <div className="exec-milestones-grid">
                    {(quote.paymentSchedule ?? []).map((m, idx) => (
                      <div className="exec-milestone-card" key={m.id || idx}>
                        <div className="exec-ms-header">
                          <span className="exec-ms-step">الدفعة {idx + 1}</span>
                          <span className="exec-ms-perc ltr-num">{m.percentage}%</span>
                        </div>
                        <strong className="exec-ms-amount ltr-num">
                          {formatMoney(m.amount)}
                        </strong>
                        <span className="exec-ms-desc">{m.name}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Section 4: Bank Info & Contractual Terms */}
              {page.showBankAndTerms && (
                <section className="exec-section">
                  <h2 className="exec-section-title">
                    <span className="exec-sec-num">{hasMilestones ? 4 : 3}</span>
                    <span>بيانات التحويل البنكي والشروط التعاقدية</span>
                  </h2>

                  {hasBankInfo && (
                    <div className="exec-bank-grid">
                      <div className="exec-bank-item">
                        <small>الجهة المصرفية / البنك:</small>
                        <b>{quote.termsInfo?.bankInfo?.bankName || 'مصرف معتمد'}</b>
                      </div>
                      <div className="exec-bank-item">
                        <small>اسم المستفيد الرسمي:</small>
                        <b>{quote.termsInfo?.bankInfo?.accountName || 'مؤسسة طِرَاس'}</b>
                      </div>
                      <div className="exec-bank-item iban-col">
                        <small>رقم الآيبان الدولي (IBAN):</small>
                        <b dir="ltr" className="exec-iban-badge">
                          {quote.termsInfo?.bankInfo?.iban || '—'}
                        </b>
                      </div>
                    </div>
                  )}

                  <ul className="exec-terms-list">
                    {termsList.map((term, idx) => (
                      <li key={idx}>
                        <span className="exec-term-bullet">{idx + 1}.</span>
                        <span>{term}</span>
                      </li>
                    ))}
                  </ul>

                  {quote.termsInfo?.notes && (
                    <div className="exec-closing-note">
                      <strong>ملاحظة ختامية: </strong>
                      <span>{quote.termsInfo.notes}</span>
                    </div>
                  )}
                </section>
              )}

              {/* Section 5: Formal Approval & Signatures */}
              {page.showSignatures && (
                <section className="exec-section exec-approval-section">
                  <h2 className="exec-section-title">
                    <span className="exec-sec-num">{hasMilestones ? 5 : 4}</span>
                    <span>اعتماد الاتفاق والتفويض ببدء العمل</span>
                  </h2>
                  <p className="exec-approval-intro">
                    يُعد توقيع الطرفين أدناه موافقةً رسمية على نطاق العمل الفني والعرض المالي
                    الموضح في هذه الوثيقة وإيذانًا ببدء التنفيذ:
                  </p>
                  <div className="exec-signatures-grid">
                    <div className="exec-sig-box">
                      <div className="exec-sig-role">الطرف الأول (مقدم العرض / المنفذ)</div>
                      <div className="exec-sig-field">
                        <span>الجهة / الاسم:</span>
                        <b>استوديو طِرَاس للحلول الإبداعية</b>
                      </div>
                      <div className="exec-sig-field">
                        <span>التوقيع والختم:</span>
                        <span className="exec-sig-dots">
                          ...................................................
                        </span>
                      </div>
                    </div>

                    <div className="exec-sig-box">
                      <div className="exec-sig-role">الطرف الثاني (العميل / المفوض بالاعتماد)</div>
                      <div className="exec-sig-field">
                        <span>الاسم / الجهة:</span>
                        <b>{clientName}</b>
                      </div>
                      <div className="exec-sig-field">
                        <span>التوقيع والختم:</span>
                        <span className="exec-sig-dots">
                          ...................................................
                        </span>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              <footer className="exec-document-footer">
                <span>رقم المرجع: {quote.number}</span>
                <span>تم إعداد هذه الوثيقة عبر طِرَاس</span>
                <span>
                  صفحة {page.pageNumber} من {page.totalPages}
                </span>
              </footer>
            </div>
          </article>
        )
      })}
    </div>
  )
}

