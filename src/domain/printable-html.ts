import { DEFAULT_TERMS, calculateQuote, type Quote } from './quote'
import { paginateQuoteDocument } from './pagination'

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function exportPrintableQuoteHtml(quote: Quote): string {
  const paginated = paginateQuoteDocument(quote)
  const calc = calculateQuote(quote)
  const clientName = quote.client || quote.clientInfo?.name || 'العميل المحترم'
  const validityDays = quote.termsInfo?.validityDays ?? 15
  const termsList = quote.termsInfo?.terms ?? DEFAULT_TERMS
  const hasMilestones = Boolean(quote.paymentSchedule && quote.paymentSchedule.length > 0)
  const hasBankInfo = Boolean(
    quote.termsInfo?.bankInfo?.iban ||
      quote.termsInfo?.bankInfo?.bankName ||
      quote.termsInfo?.bankInfo?.accountName,
  )
  const fmt = (n: number) =>
    `${(Number(n) || 0).toLocaleString('ar-SA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ر.س.`

  const pagesHtml = paginated.pages
    .map((page) => {
      const headerHtml = page.showHeaderBanner
        ? `
      <header class="exec-header-banner">
        <div class="exec-banner-right">
          <div class="exec-brand-strip">
            <span class="exec-emblem">ط</span>
            <span class="exec-brand-name">طِرَاس</span>
            <span>·</span>
            <span>وثيقة نطاق العمل وعرض السعر</span>
            <span class="exec-status-pill">${escapeHtml(quote.status)}</span>
          </div>
          <h1 class="exec-doc-title">${escapeHtml(quote.title || 'وثيقة نطاق العمل وعرض السعر الفني والمالي')}</h1>
          <p class="exec-doc-subtitle">عرض سعر رسمي ومفصّل مقدم إلى: <strong>${escapeHtml(clientName)}</strong></p>
        </div>
        <div class="exec-banner-meta-box">
          <div class="exec-meta-line"><span>رقم الوثيقة:</span><strong class="ltr-num">${escapeHtml(quote.number)}</strong></div>
          <div class="exec-meta-line"><span>تاريخ الإصدار:</span><strong class="ltr-num">${escapeHtml(quote.updatedAt)}</strong></div>
          <div class="exec-meta-line"><span>مدة الصلاحية:</span><strong>${validityDays} يومًا من تاريخه</strong></div>
        </div>
      </header>`
        : `
      <header class="exec-continuation-banner">
        <div class="cont-right">
          <span class="exec-emblem">أ</span>
          <strong>${escapeHtml(quote.title || 'عرض سعر')}</strong>
          <span class="cont-tag">تابع الوثيقة</span>
        </div>
        <div class="cont-left">
          <span>رقم المرجع: <b class="ltr-num">${escapeHtml(quote.number)}</b></span>
          <span>·</span>
          <span>صفحة ${page.pageNumber} من ${page.totalPages}</span>
        </div>
      </header>`

      const partiesAndSummaryHtml = page.showPartiesAndSummary
        ? `
        <section class="exec-parties-grid">
          <div class="exec-party-card">
            <span class="exec-party-label">الطرف الأول (مقدم العرض / المنفذ):</span>
            <strong class="exec-party-name">استوديو طِرَاس للحلول الإبداعية والتقنية</strong>
            <span class="exec-party-sub">قالب: ${escapeHtml(quote.templateSnapshot.name)} · العملة: ريال سعودي (SAR)</span>
          </div>
          <div class="exec-party-card highlight-client">
            <span class="exec-party-label">الطرف الثاني (العميل / الجهة المستفيدة):</span>
            <strong class="exec-party-name">${escapeHtml(clientName)}</strong>
            <span class="exec-party-sub">${escapeHtml(quote.clientInfo?.contactPerson ? `عناية: ${quote.clientInfo.contactPerson}` : quote.clientInfo?.address || `السادة إدارة ${clientName} المحترمين`)}</span>
          </div>
          <div class="exec-party-card">
            <span class="exec-party-label">بيانات التواصل والسجل الرسمي:</span>
            <span class="exec-party-sub">${escapeHtml(quote.clientInfo?.phone || quote.clientInfo?.email || quote.clientInfo?.taxNumber || 'وثيقة عرض فني ومالي معتمد')}</span>
          </div>
        </section>
        <section class="exec-section avoid-break">
          <h2 class="exec-section-title"><span class="exec-sec-num">1</span><span>الملخص التنفيذي ونطاق العمل</span></h2>
          <div class="exec-summary-card"><p>${escapeHtml(quote.summary || 'يشمل هذا العرض تنفيذ وتوريد البنود والخدمات الموضحة في الجدول المالي أدناه وفق أعلى المعايير المهنية والفنية المعتمدة.')}</p></div>
        </section>`
        : ''

      const itemsTableHtml =
        page.items.length > 0
          ? `
        <section class="exec-section">
          <h2 class="exec-section-title">
            <span class="exec-sec-num">2</span>
            <span>${page.isTableContinuation ? 'تابع جدول التسعيرات والبنود التفصيلية' : 'جدول التسعيرات والبنود التفصيلية'}</span>
          </h2>
          <div class="exec-table-wrap">
            <table class="exec-pricing-table">
              <thead>
                <tr>
                  <th style="width:36px;text-align:center">م</th>
                  <th>البند / المرحلة ونطاق العمل المشمول</th>
                  <th style="width:60px;text-align:center">الكمية</th>
                  <th style="width:110px;text-align:left">سعر الوحدة</th>
                  <th style="width:120px;text-align:left">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                ${page.items
                  .map(
                    (row) => `
                  <tr class="avoid-break">
                    <td style="text-align:center"><span class="exec-row-badge">${row.globalIndex}</span></td>
                    <td>
                      <strong class="exec-item-title">${escapeHtml(row.item.title || 'بند خدمة أو توريد')}</strong>
                      ${row.item.description ? `<span class="exec-item-desc">${escapeHtml(row.item.description)}</span>` : ''}
                    </td>
                    <td style="text-align:center"><span class="ltr-num">${row.item.quantity}</span></td>
                    <td style="text-align:left"><span class="ltr-num">${fmt(row.item.unitPrice)}</span></td>
                    <td style="text-align:left"><strong class="ltr-num">${fmt(row.lineTotal)}</strong></td>
                  </tr>`,
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
          ${page.hasMoreItemsAfter ? `<div class="table-cont-note">يتبع بقية البنود في الصفحة التالية (${page.pageNumber + 1}) ←</div>` : ''}
        </section>`
          : ''

      const financialSummaryHtml = page.showFinancialSummary
        ? `
        <section class="exec-financial-summary avoid-break">
          <div class="exec-financial-notes">
            <span class="exec-currency-badge">العملة المعتمدة: الريال السعودي (SAR)</span>
            <p>${calc.taxRate > 0 ? `الأسعار أعلاه خاضعة لضريبة القيمة المضافة بنسبة ${calc.taxRate}%.` : 'الأسعار الموضحة أعلاه صافية ولا تشمل ضريبة القيمة المضافة.'}</p>
          </div>
          <div class="exec-totals-box">
            <div class="exec-totals-line"><span>المجموع الفرعي (${quote.items.length} بنود):</span><b class="ltr-num">${fmt(calc.subtotal)}</b></div>
            ${calc.discount > 0 ? `<div class="exec-totals-line is-discount"><span>الخصم التجاري الممنوح:</span><b class="ltr-num">- ${fmt(calc.discount)}</b></div>` : ''}
            ${
              calc.taxRate > 0
                ? `<div class="exec-totals-line"><span>الصافي الخاضع للضريبة:</span><b class="ltr-num">${fmt(calc.taxableAmount)}</b></div>
                   <div class="exec-totals-line"><span>ضريبة القيمة المضافة (${calc.taxRate}%):</span><b class="ltr-num">${fmt(calc.tax)}</b></div>`
                : ''
            }
            <div class="exec-grand-total-bar"><span>الإجمالي الكلي للمشروع:</span><strong class="ltr-num">${fmt(calc.total)}</strong></div>
          </div>
        </section>`
        : ''

      const milestonesHtml =
        page.showMilestones && hasMilestones
          ? `
        <section class="exec-section avoid-break">
          <h2 class="exec-section-title"><span class="exec-sec-num">3</span><span>جدولة الدفعات المالية والمراحل</span></h2>
          <div class="exec-milestones-grid">
            ${(quote.paymentSchedule ?? [])
              .map(
                (m, idx) => `
              <div class="exec-milestone-card">
                <div class="exec-ms-header"><span>الدفعة ${idx + 1}</span><span class="ltr-num">${m.percentage}%</span></div>
                <strong class="ltr-num">${fmt(m.amount)}</strong>
                <span>${escapeHtml(m.name)}</span>
              </div>`,
              )
              .join('')}
          </div>
        </section>`
          : ''

      const bankAndTermsHtml = page.showBankAndTerms
        ? `
        <section class="exec-section avoid-break">
          <h2 class="exec-section-title"><span class="exec-sec-num">${hasMilestones ? 4 : 3}</span><span>بيانات التحويل البنكي والشروط التعاقدية</span></h2>
          ${
            hasBankInfo
              ? `<div class="exec-bank-grid">
                  <div><small>الجهة المصرفية / البنك:</small><b>${escapeHtml(quote.termsInfo?.bankInfo?.bankName || 'مصرف معتمد')}</b></div>
                  <div><small>اسم المستفيد الرسمي:</small><b>${escapeHtml(quote.termsInfo?.bankInfo?.accountName || 'مؤسسة طِرَاس')}</b></div>
                  <div><small>رقم الآيبان الدولي (IBAN):</small><b dir="ltr">${escapeHtml(quote.termsInfo?.bankInfo?.iban || '—')}</b></div>
                </div>`
              : ''
          }
          <ul class="exec-terms-list">
            ${termsList.map((t, i) => `<li><b>${i + 1}.</b> <span>${escapeHtml(t)}</span></li>`).join('')}
          </ul>
          ${quote.termsInfo?.notes ? `<div class="exec-closing-note"><strong>ملاحظة ختامية: </strong><span>${escapeHtml(quote.termsInfo.notes)}</span></div>` : ''}
        </section>`
        : ''

      const signaturesHtml = page.showSignatures
        ? `
        <section class="exec-section exec-approval-section avoid-break">
          <h2 class="exec-section-title"><span class="exec-sec-num">${hasMilestones ? 5 : 4}</span><span>اعتماد الاتفاق والتفويض ببدء العمل</span></h2>
          <div class="exec-signatures-grid">
            <div class="exec-sig-box">
              <div class="exec-sig-role">الطرف الأول (مقدم العرض / المنفذ)</div>
              <div>الجهة: <b>استوديو طِرَاس للحلول الإبداعية</b></div>
              <div>التوقيع والختم: ..........................................</div>
            </div>
            <div class="exec-sig-box">
              <div class="exec-sig-role">الطرف الثاني (العميل / المفوض بالاعتماد)</div>
              <div>الاسم / الجهة: <b>${escapeHtml(clientName)}</b></div>
              <div>التوقيع والختم: ..........................................</div>
            </div>
          </div>
        </section>`
        : ''

      return `
    <article class="quote-document a4-page-sheet" data-page="${page.pageNumber}">
      ${headerHtml}
      <div class="exec-document-body">
        ${partiesAndSummaryHtml}
        ${itemsTableHtml}
        ${financialSummaryHtml}
        ${milestonesHtml}
        ${bankAndTermsHtml}
        ${signaturesHtml}
        <footer class="exec-document-footer">
          <span>رقم المرجع: ${escapeHtml(quote.number)}</span>
          <span>تم إعداد هذه الوثيقة عبر طِرَاس</span>
          <span>صفحة ${page.pageNumber} من ${page.totalPages}</span>
        </footer>
      </div>
    </article>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(quote.number)} — ${escapeHtml(quote.title)}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm 12mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Cairo', 'Tajawal', -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 24px; background: #eef2f6; color: #0f172a; direction: rtl; }
    .no-print-bar { max-width: 210mm; margin: 0 auto 16px; background: #1e3a5f; color: #fff; padding: 12px 18px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
    .no-print-bar button { background: #9a6b3b; color: #fff; border: 0; padding: 8px 16px; border-radius: 6px; font-weight: 700; cursor: pointer; font-family: inherit; }
    .a4-page-sheet { width: 210mm; min-height: 285mm; margin: 0 auto 24px; background: #fff; box-shadow: 0 10px 30px rgba(0,0,0,0.12); border-radius: 4px; overflow: hidden; display: flex; flex-direction: column; page-break-after: always; break-after: page; }
    .a4-page-sheet:last-child { page-break-after: auto; break-after: auto; }
    .exec-header-banner { background: #1e3a5f; color: #fff; border-bottom: 4px solid #9a6b3b; padding: 20px 26px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .exec-continuation-banner { background: #1e3a5f; color: #fff; border-bottom: 3px solid #9a6b3b; padding: 12px 26px; display: flex; justify-content: space-between; align-items: center; font-size: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .exec-document-body { padding: 20px 26px; display: flex; flex-direction: column; gap: 16px; flex: 1; }
    .exec-parties-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; font-size: 11px; }
    .exec-party-card { display: flex; flex-direction: column; gap: 3px; }
    .exec-section-title { font-size: 13px; font-weight: 800; color: #1e3a5f; border-right: 4px solid #9a6b3b; padding-right: 8px; margin: 0 0 8px; display: flex; align-items: center; gap: 6px; }
    .exec-sec-num { background: #1e3a5f; color: #fff; width: 18px; height: 18px; border-radius: 4px; display: inline-grid; place-items: center; font-size: 10px; }
    .exec-pricing-table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .exec-pricing-table th { background: #f1f5f9; color: #1e3a5f; border-bottom: 2px solid #1e3a5f; padding: 8px 10px; text-align: right; }
    .exec-pricing-table td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    .exec-item-desc { display: block; font-size: 10px; color: #64748b; margin-top: 2px; }
    .exec-financial-summary { display: grid; grid-template-columns: 1fr 280px; gap: 14px; margin-top: 8px; }
    .exec-totals-box { border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; }
    .exec-totals-line { display: flex; justify-content: space-between; padding: 6px 12px; font-size: 11px; border-bottom: 1px solid #f1f5f9; }
    .exec-grand-total-bar { background: #1e3a5f; color: #fff; border-right: 4px solid #9a6b3b; padding: 9px 12px; display: flex; justify-content: space-between; font-weight: 800; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .exec-milestones-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; }
    .exec-milestone-card { background: #f8fafc; border: 1px solid #cbd5e1; border-top: 3px solid #1e3a5f; border-radius: 6px; padding: 8px 10px; display: flex; flex-direction: column; gap: 3px; font-size: 11px; }
    .exec-bank-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; font-size: 11px; margin-bottom: 8px; }
    .exec-signatures-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 11px; }
    .exec-sig-box { border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
    .exec-document-footer { margin-top: auto; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #64748b; }
    .ltr-num { direction: ltr; unicode-bidi: embed; display: inline-block; }
    .avoid-break { break-inside: avoid; page-break-inside: avoid; }
    thead { display: table-header-group; }
    @media print {
      body { background: #fff !important; padding: 0 !important; }
      .no-print-bar { display: none !important; }
      .a4-page-sheet { width: 100% !important; min-height: auto !important; margin: 0 !important; box-shadow: none !important; border-radius: 0 !important; }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <span>وثيقة عرض سعر جاهزة للطباعة والحفظ كـ PDF (${paginated.totalPages} صفحات A4)</span>
    <button onclick="window.print()">طباعة / حفظ كملف PDF</button>
  </div>
  ${pagesHtml}
</body>
</html>`
}

