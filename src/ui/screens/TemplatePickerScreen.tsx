import { ChevronLeft, ChevronRight } from 'lucide-react'
import { starterTemplates } from '../../domain/quote'
import { DocumentPreview } from '../components/DocumentPreview'

export interface TemplatePickerScreenProps {
  activeTemplateId: string
  setActiveTemplateId: (id: string) => void
  onBackToLibrary: () => void
  onOpenDesigner: () => void
  onCreateFromTemplate: (templateId: string) => void
}

export function TemplatePickerScreen({
  activeTemplateId,
  setActiveTemplateId,
  onBackToLibrary,
  onOpenDesigner,
  onCreateFromTemplate,
}: TemplatePickerScreenProps) {
  return (
    <main className="flow-screen">
      <button className="back-link" onClick={onBackToLibrary}>
        <ChevronRight size={17} />
        العودة إلى المكتبة
      </button>
      <div className="flow-title">
        <span className="step-label">عرض جديد · الخطوة ١ من ٢</span>
        <h1>اختر نقطة البداية</h1>
        <p>كل قالب يبدأ ببيانات مثال لتتعرف على شكل الوثيقة قبل إدخال بياناتك.</p>
      </div>
      <div className="template-grid">
        {starterTemplates.map((template) => (
          <button
            key={template.id}
            className={`template-choice ${activeTemplateId === template.id ? 'chosen' : ''}`}
            onClick={() => setActiveTemplateId(template.id)}
          >
            <DocumentPreview quote={template.sample} accent={template.color} />
            <div className="template-choice-info">
              <span>
                <b>{template.name}</b>
                <small>{template.note}</small>
              </span>
              <span className="radio-dot">{activeTemplateId === template.id && <i />}</span>
            </div>
          </button>
        ))}
      </div>
      <div className="flow-bottom">
        <button className="text-link" onClick={onOpenDesigner}>
          أريد تصميم قالب خاص <ChevronLeft size={15} />
        </button>
        <button
          className="button primary-button"
          onClick={() => onCreateFromTemplate(activeTemplateId)}
        >
          استخدم هذا القالب <ChevronLeft size={17} />
        </button>
      </div>
    </main>
  )
}

