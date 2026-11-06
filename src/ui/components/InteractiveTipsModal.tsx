import React, { useState } from 'react'
import {
  Sparkles,
  X,
  Layers,
  FolderPlus,
  HandMetal,
  CheckCircle2,
  FolderInput,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

export interface InteractiveTipsModalProps {
  isOpen: boolean
  onClose: () => void
}

interface GestureGuide {
  id: string
  title: string
  badge: string
  description: string
  steps: string[]
  icon: React.ReactNode
  interactiveDemoType: 'merge' | 'select' | 'hub' | 'folder-drop'
}

export function InteractiveTipsModal({ isOpen, onClose }: InteractiveTipsModalProps) {
  const [activeTab, setActiveTab] = useState<number>(0)
  
  // Interactive mini-playground states
  const [isDemoSelected, setIsDemoSelected] = useState(false)
  const [demoStackCount, setDemoStackCount] = useState(1)
  const [demoMerged, setDemoMerged] = useState(false)
  const [demoDropFinished, setDemoDropFinished] = useState(false)

  if (!isOpen) return null

  const guides: GestureGuide[] = [
    {
      id: 'select',
      title: 'طية الورقة وتحديد العروض',
      badge: 'تحديد واقعي',
      description: 'انقر على أي ورقة لتحديدها، وستنثني زاويتها العلوية ثلاثية الأبعاد وكأنها صفحة حقيقية مع شارة الصح الزجاجية.',
      steps: [
        'انقر على شارة التحديد الدائرية أو أيقونة الصح أعلى الورقة.',
        'لاحظ انطواء زاوية الورقة (Page Curl) وظلها الداخلي الطبيعي.',
        'تضاف الورقة فوراً إلى مستند التحديد العائم في أسفل الواجهة.',
      ],
      icon: <CheckCircle2 size={18} className="guide-icon-accent" />,
      interactiveDemoType: 'select',
    },
    {
      id: 'merge',
      title: 'دمج ورقتين وتشكيل مجلد جديد',
      badge: 'إيماءة أونو',
      description: 'اسحب أي عرض سعر فوق عرض سعر آخر لفتحهما كمروحة كروت (Uno Fan)، وعند الإفلات يتحولان فوراً إلى مجلد جديد!',
      steps: [
        'اضغط مطولاً على أي عرض سعر واسحبه باتجاه عرض سعر آخر.',
        'تفتح الورقتان كبطاقات لعب مائلة (Uno Fan) معلنة الاستعداد للدمج.',
        'أفلت الورقة ليظهر المجلد الجديد تلقائياً مع حركة ابتلاع واحتواء سينمائية.',
      ],
      icon: <Layers size={18} className="guide-icon-accent" />,
      interactiveDemoType: 'merge',
    },
    {
      id: 'hub',
      title: 'مستند التحديد وقوس العمليات',
      badge: 'القوس الشعاعي',
      description: 'اجمع الأوراق في المستند العائم أسفل الشاشة، واسحبه للأعلى نحو أيقونة الإجراء لنقلها أو تكرارها أو أرشفها دفعة واحدة.',
      steps: [
        'اسحب أوراقك إلى الكبسولة العائمة بالأسفل، وشاهد تراكم الأوراق وتحديث العداد (1, 2, 3... +6).',
        'تنبثق أيقونات الإجراءات في قوس نصف دائري أنيق (Semi-Radial Arc) فوق المستند.',
        'اسحب المستند للأعلى نحو أيقونة العملية (نقل، نسخ، سلة) لتنفيذها فوراً.',
      ],
      icon: <HandMetal size={18} className="guide-icon-accent" />,
      interactiveDemoType: 'hub',
    },
    {
      id: 'folder-drop',
      title: 'السحب المباشر إلى المجلدات',
      badge: 'ابتلاع الأوراق',
      description: 'اسحب ورقة واحدة أو حزمة المستند بالكامل وأفلتها فوق أي مجلد في الشبكة لنقلها بسلاسة مع شارة العدد الفعلي.',
      steps: [
        'اسحب الورقة أو مستند التحديد التفاعلي مباشرة نحو أي مجلد.',
        'تنفتح فوهة المجلد الأمامية وترتفع أوراقه الداخلية مرحبة بالحزمة.',
        'عند الإفلات، تنزلق الأوراق داخل الجيب مع ارتداد المجلد وشارة العدد (+3 مثلاً).',
      ],
      icon: <FolderInput size={18} className="guide-icon-accent" />,
      interactiveDemoType: 'folder-drop',
    },
  ]

  const currentGuide = guides[activeTab]

  return (
    <div className="tips-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="tips-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tips-modal-header">
          <div className="tips-header-title-row">
            <span className="tips-sparkle-pill">
              <Sparkles size={14} />
              <span>دليل الإيماءات التفاعلية</span>
            </span>
            <button
              className="tips-close-btn"
              onClick={onClose}
              aria-label="إغلاق الدليل"
              title="إغلاق (Esc)"
            >
              <X size={16} />
            </button>
          </div>
          <p className="tips-header-subtitle">
            تمتلك واجهة «طِرَاس» إيماءات وحركات سحب وإفلات فيزيائية صُممت لتسهيل إدارة عروضك بأقصى سرعة واحترافية.
          </p>
        </div>

        {/* Tab Navigation Pills */}
        <div className="tips-tabs-bar" role="tablist">
          {guides.map((g, idx) => (
            <button
              key={g.id}
              role="tab"
              aria-selected={activeTab === idx}
              className={`tips-tab-btn ${activeTab === idx ? 'active' : ''}`}
              onClick={() => setActiveTab(idx)}
            >
              {g.icon}
              <span>{g.title.split(' ')[0]} {g.title.split(' ')[1]}</span>
            </button>
          ))}
        </div>

        {/* Guide Content Body */}
        <div className="tips-body-grid">
          {/* Right Column: Explanations & Steps */}
          <div className="tips-text-pane">
            <div className="tips-pane-badge-row">
              <span className="tips-feature-badge">{currentGuide.badge}</span>
              <h3 className="tips-feature-title">{currentGuide.title}</h3>
            </div>
            <p className="tips-feature-desc">{currentGuide.description}</p>

            <div className="tips-steps-list">
              <span className="tips-steps-header">خطوات التجربة:</span>
              <ol>
                {currentGuide.steps.map((st, i) => (
                  <li key={i}>
                    <span className="step-num">{i + 1}</span>
                    <span className="step-txt">{st}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Left Column: Interactive Playground / Live Mini-Visualizer */}
          <div className="tips-interactive-sandbox">
            <div className="sandbox-header">
              <span>جرّب الحركة بيدك:</span>
              <small>تفاعل مباشر</small>
            </div>

            <div className="sandbox-canvas">
              {/* Demo 1: Folded Corner Demo */}
              {currentGuide.interactiveDemoType === 'select' && (
                <div className="demo-stage-select">
                  <div
                    className={`demo-paper-card ${isDemoSelected ? 'selected' : ''}`}
                    onClick={() => setIsDemoSelected((v) => !v)}
                  >
                    <div className="demo-paper-fold-corner" />
                    <div className="demo-paper-header">
                      <span className="demo-logo-dot" />
                      <span className="demo-pill-num">AN-2026-001</span>
                    </div>
                    <div className="demo-paper-lines">
                      <i style={{ width: '80%' }} />
                      <i style={{ width: '55%' }} />
                      <i style={{ width: '70%' }} />
                    </div>
                    <span className="demo-check-badge">
                      <CheckCircle2 size={13} />
                    </span>
                  </div>
                  <button
                    className="demo-action-btn"
                    onClick={() => setIsDemoSelected((v) => !v)}
                  >
                    {isDemoSelected ? 'إلغاء التحديد (انفراد الورقة)' : 'انقر لتحديد الورقة (مشاهدة الطية)'}
                  </button>
                </div>
              )}

              {/* Demo 2: Uno Merge Fan Demo */}
              {currentGuide.interactiveDemoType === 'merge' && (
                <div className="demo-stage-merge">
                  {!demoMerged ? (
                    <div className="demo-fan-rig">
                      <div className="demo-uno-card fan-left">
                        <span>عرض سعر (أ)</span>
                      </div>
                      <div className="demo-uno-card fan-right">
                        <span>عرض سعر (ب)</span>
                      </div>
                    </div>
                  ) : (
                    <div className="demo-created-folder-rig">
                      <div className="demo-folder-art">
                        <div className="demo-folder-tab" />
                        <div className="demo-front-pocket">
                          <FolderPlus size={16} />
                          <span>مجلد جديد (+2)</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <button
                    className="demo-action-btn"
                    onClick={() => setDemoMerged((v) => !v)}
                  >
                    {!demoMerged ? 'انقر لمحاكاة إفلات العرضين ودمجهما' : 'إعادة تعيين العرضين'}
                  </button>
                </div>
              )}

              {/* Demo 3: Selection Hub & Arc Demo */}
              {currentGuide.interactiveDemoType === 'hub' && (
                <div className="demo-stage-hub">
                  <div className="demo-hub-radial-preview">
                    {/* Radial Arc Preview */}
                    <div className="demo-arc-nodes">
                      <span className="demo-arc-node blue" title="نقل إلى مجلد">📁</span>
                      <span className="demo-arc-node green" title="نسخ وتكرار">📑</span>
                      <span className="demo-arc-node purple" title="الحالة والأرشفة">📦</span>
                      <span className="demo-arc-node red" title="سلة المحذوفات">🗑️</span>
                    </div>

                    {/* Central Hub Token */}
                    <div className="demo-hub-capsule">
                      <div className="demo-hub-stack">
                        {Array.from({ length: Math.min(demoStackCount, 5) }).map((_, i) => (
                          <div
                            key={i}
                            className={`demo-hub-sheet sheet-${i + 1}`}
                            style={{
                              transform: `rotate(${i * 6 - 8}deg) translate(${i * 2}px, ${-i * 1}px)`,
                            }}
                          />
                        ))}
                      </div>
                      <span className="demo-counter-badge">
                        {demoStackCount >= 6 ? `+${demoStackCount}` : demoStackCount}
                      </span>
                    </div>
                  </div>

                  <div className="demo-hub-controls">
                    <button
                      className="demo-micro-btn"
                      onClick={() => setDemoStackCount((c) => Math.min(c + 1, 8))}
                    >
                      + إضافة ورقة للتراكم
                    </button>
                    <button
                      className="demo-micro-btn reset"
                      onClick={() => setDemoStackCount(1)}
                    >
                      إعادة لورقة واحدة
                    </button>
                  </div>
                </div>
              )}

              {/* Demo 4: Direct Folder Drop Demo */}
              {currentGuide.interactiveDemoType === 'folder-drop' && (
                <div className="demo-stage-folder">
                  <div className={`demo-folder-drop-art ${demoDropFinished ? 'absorbing' : ''}`}>
                    <div className="demo-folder-top-pill">
                      <span>مشاريع الرياض</span>
                      <span className="demo-count-chip">{demoDropFinished ? '4 عروض (+3)' : '1 عرض'}</span>
                    </div>
                    <div className="demo-folder-graphic">
                      {demoDropFinished && <div className="demo-sliding-bundle" />}
                      <div className="demo-folder-jacket">
                        <FolderInput size={20} />
                      </div>
                    </div>
                  </div>
                  <button
                    className="demo-action-btn"
                    onClick={() => {
                      setDemoDropFinished(true)
                      setTimeout(() => setDemoDropFinished(false), 1600)
                    }}
                  >
                    محاكاة إسقاط حزمة أوراق فوق المجلد
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="tips-modal-footer">
          <div className="tips-footer-dots">
            {guides.map((_, i) => (
              <span
                key={i}
                className={`footer-dot ${activeTab === i ? 'active' : ''}`}
                onClick={() => setActiveTab(i)}
              />
            ))}
          </div>

          <div className="tips-footer-actions">
            {activeTab > 0 && (
              <button
                className="button outline-button tips-nav-btn"
                onClick={() => setActiveTab((t) => t - 1)}
              >
                <ChevronRight size={14} />
                السابق
              </button>
            )}

            {activeTab < guides.length - 1 ? (
              <button
                className="button primary-button tips-nav-btn"
                onClick={() => setActiveTab((t) => t + 1)}
              >
                التالي: {guides[activeTab + 1].title.split(' ')[0]}
                <ChevronLeft size={14} />
              </button>
            ) : (
              <button className="button primary-button tips-nav-btn" onClick={onClose}>
                فهمت، جاهز للتجربة!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}