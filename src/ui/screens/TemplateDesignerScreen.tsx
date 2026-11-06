import { Check, ChevronRight, GripVertical, MoreHorizontal, Plus } from 'lucide-react'
import { starterTemplates } from '../../domain/quote'
import { QuoteDocument } from '../components/QuoteDocument'

export interface TemplateDesignerScreenProps {
  activeTemplateId: string
  designerSection: string
  setDesignerSection: (sec: string) => void
  onBackToTemplates: () => void
  onShowToast: (msg: string) => void
  onSaveTemplate: () => void
}

export function TemplateDesignerScreen({
  activeTemplateId,
  designerSection,
  setDesignerSection,
  onBackToTemplates,
  onShowToast,
  onSaveTemplate,
}: TemplateDesignerScreenProps) {
  return (
    <main className="designer-screen">
      <div className="designer-head">
        <button className="back-link" onClick={onBackToTemplates}>
          <ChevronRight size={17} />
          القوالب
        </button>
        <div>
          <span className="step-label">مصمم القوالب المرئي</span>
          <h1>قالب جديد</h1>
        </div>
        <div className="editor-head-actions">
          <button
            className="button outline-button"
            onClick={() => onShowToast('تظهر المعاينة ببيانات المثال')}
          >
            معاينة
          </button>
          <button className="button primary-button" onClick={onSaveTemplate}>
            <Check size={16} />
            حفظ القالب
          </button>
        </div>
      </div>
      <div className="designer-workarea">
        <aside className="component-panel">
          <b>مكونات القالب</b>
          <small>أضف كتلة إلى بنية الوثيقة</small>
          {[
            'عنوان الوثيقة',
            'بيانات العميل',
            'بيانات المشروع',
            'جدول البنود',
            'ملخص مالي',
            'شروط وتوقيع',
          ].map((block) => (
            <button key={block} onClick={() => onShowToast(`أضيفت كتلة «${block}»`)}>
              <Plus size={15} />
              {block}
            </button>
          ))}
          <div className="designer-hint">ابدأ بكتل منظمة، ثم عدّل تسميات الحقول وترتيبها.</div>
        </aside>
        <section className="structure-panel">
          <b>بنية الوثيقة</b>
          <small>رتّب الكتل وأظهر ما يحتاجه عرضك</small>
          {['رأس العرض', 'بيانات العميل', 'جدول البنود', 'ملخص مالي', 'الشروط'].map(
            (block, index) => (
              <button
                key={block}
                className={designerSection === block ? 'active' : ''}
                onClick={() => setDesignerSection(block)}
              >
                <GripVertical size={16} />
                <span className="section-number">{index + 1}</span>
                {block}
                <MoreHorizontal size={16} />
              </button>
            ),
          )}
          <div className="structure-settings">
            <b>إعدادات العنصر</b>
            <label>
              اسم القسم
              <input
                value={designerSection}
                onChange={(e) => setDesignerSection(e.target.value)}
              />
            </label>
            <label className="check-option">
              <input type="checkbox" defaultChecked /> إظهار هذا القسم
            </label>
          </div>
        </section>
        <section className="designer-preview">
          <div className="preview-toolbar">
            <span>
              <b>معاينة القالب</b>
              <small>بيانات مثال · A4</small>
            </span>
          </div>
          <div className="a4-stage">
            <QuoteDocument
              quote={
                (
                  starterTemplates.find((template) => template.id === activeTemplateId) ??
                  starterTemplates[0]
                ).sample
              }
            />
          </div>
        </section>
      </div>
    </main>
  )
}

