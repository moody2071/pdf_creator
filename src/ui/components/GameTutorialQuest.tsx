import React, { useEffect, useState } from 'react'
import {
  Gamepad2,
  X,
  CheckCircle2,
  Trophy,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Layers,
  FolderPlus,
  HandMetal,
  FolderInput,
  Volume2,
  VolumeX,
} from 'lucide-react'
import type { Quote, QuoteFolder } from '../../domain/quote'

export interface GameTutorialQuestProps {
  isActive: boolean
  activeStep: number // 1, 2, 3, 4, or 5 (victory)
  onClose: () => void
  onNextStep: () => void
  onPrevStep: () => void
  onSetStep: (step: number) => void
  quotes: Quote[]
  folders: QuoteFolder[]
}

interface StepDefinition {
  step: number
  title: string
  shortBadge: string
  instruction: string
  actionHint: string
  icon: React.ReactNode
}

// Playful retro/modern synthesized game chimes with zero external audio assets
function playAudioChime(type: 'step' | 'victory' | 'click', isMuted: boolean) {
  if (isMuted || typeof window === 'undefined') return
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    if (ctx.state === 'suspended') {
      ctx.resume()
    }
    const now = ctx.currentTime

    if (type === 'step') {
      // 2-tone melodic level-up chime (C5 -> G5)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(523.25, now)
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.14)
      gain.gain.setValueAtTime(0.22, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.38)
    } else if (type === 'victory') {
      // 4-tone triumphant victory fanfare: C5 -> E5 -> G5 -> C6
      const freqs = [523.25, 659.25, 783.99, 1046.5]
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        const startTime = now + idx * 0.12
        osc.frequency.setValueAtTime(freq, startTime)
        gain.gain.setValueAtTime(0.26, startTime)
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(startTime)
        osc.stop(startTime + 0.4)
      })
    } else if (type === 'click') {
      // Soft wood/paper click sound
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(440, now)
      gain.gain.setValueAtTime(0.08, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.08)
    }
  } catch {}
}

export function GameTutorialQuest({
  isActive,
  activeStep,
  onClose,
  onNextStep,
  onPrevStep,
  onSetStep,
  quotes,
  folders,
}: GameTutorialQuestProps) {
  const [isMuted, setIsMuted] = useState(false)
  const [targetCoords, setTargetCoords] = useState<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)
  const [secondaryCoords, setSecondaryCoords] = useState<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)

  const steps: StepDefinition[] = [
    {
      step: 1,
      title: 'طية الورقة وتحديد العرض',
      shortBadge: 'المهمة 1',
      instruction: 'المس أو انقر على الزاوية العلوية لأول ورقة لمشاهدة انطوائها وانضمامها لمستند التحديد.',
      actionHint: 'انقر على زاوية العرض المحدد بالأسفل 👆',
      icon: <Layers size={16} />,
    },
    {
      step: 2,
      title: 'دمج عرضين لتشكيل مجلد (Uno Fan)',
      shortBadge: 'المهمة 2',
      instruction: 'اسحب هذه الورقة وضعها فوق الورقة المجاورة لتشاهد انفراج مروحة كروت الأونو وتشكّل المجلد تلقائياً.',
      actionHint: 'اسحب الورقة وأفلتها فوق الورقة المجاورة ➔',
      icon: <FolderPlus size={16} />,
    },
    {
      step: 3,
      title: 'مستند التحديد وقوس الإجراءات',
      shortBadge: 'المهمة 3',
      instruction: 'اسحب كبسولة «مستند التحديد» أسفل الشاشة للأعلى نحو أيقونة (تكرار) أو (نقل) لتجربة القوس الشعاعي.',
      actionHint: 'اسحب كبسولة التحديد للأعلى ⬆️',
      icon: <HandMetal size={16} />,
    },
    {
      step: 4,
      title: 'إسقاط الورقة وابتلاع المجلد',
      shortBadge: 'المهمة 4',
      instruction: 'اسحب هذه الورقة وألقِ بها داخل المجلد لتشاهد ارتداد المجلد وحركة ابتلاع الورقة والعداد (+1).',
      actionHint: 'أسقط الورقة داخل جيب المجلد 📂',
      icon: <FolderInput size={16} />,
    },
  ]

  // Play chimes on step completion
  useEffect(() => {
    if (!isActive) return
    if (activeStep >= 5) {
      playAudioChime('victory', isMuted)
    } else {
      playAudioChime('step', isMuted)
    }
  }, [activeStep, isActive, isMuted])

  // Track coordinates of active targets in the live workspace
  useEffect(() => {
    if (!isActive || typeof window === 'undefined') return

    const updateTargetCoords = () => {
      if (activeStep === 1) {
        // Query the corner curl button or the top-left of the first document preview
        const cornerBtn = document.querySelector('.paper-tile:not(.create-paper-tile) .paper-corner-curl-btn')
        const preview = document.querySelector('.paper-tile:not(.create-paper-tile) .document-preview')
        if (cornerBtn) {
          const rect = cornerBtn.getBoundingClientRect()
          setTargetCoords({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            width: rect.width,
            height: rect.height,
          })
          setSecondaryCoords(null)
        } else if (preview) {
          const rect = preview.getBoundingClientRect()
          setTargetCoords({
            x: rect.left + 20,
            y: rect.top + 20,
            width: 40,
            height: 40,
          })
          setSecondaryCoords(null)
        }
      } else if (activeStep === 2) {
        // Find first two quote cards
        const cards = document.querySelectorAll('.paper-tile:not(.create-paper-tile)')
        if (cards.length >= 2) {
          const rect1 = cards[0].getBoundingClientRect()
          const rect2 = cards[1].getBoundingClientRect()
          setTargetCoords({
            x: rect1.left + rect1.width / 2,
            y: rect1.top + rect1.height / 2,
            width: rect1.width,
            height: rect1.height,
          })
          setSecondaryCoords({
            x: rect2.left + rect2.width / 2,
            y: rect2.top + rect2.height / 2,
            width: rect2.width,
            height: rect2.height,
          })
        }
      } else if (activeStep === 3) {
        // Selection hub token capsule at the bottom
        const hubPill = document.querySelector('.hub-token-pill') || document.querySelector('.selection-hub-root')
        if (hubPill) {
          const rect = hubPill.getBoundingClientRect()
          setTargetCoords({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            width: rect.width,
            height: rect.height,
          })
          setSecondaryCoords(null)
        }
      } else if (activeStep === 4) {
        // From a quote card to the first folder
        const card = document.querySelector('.paper-tile:not(.create-paper-tile)')
        const folder = document.querySelector('.folder-tile-wrap')
        if (card && folder) {
          const rectCard = card.getBoundingClientRect()
          const rectFolder = folder.getBoundingClientRect()
          setTargetCoords({
            x: rectCard.left + rectCard.width / 2,
            y: rectCard.top + rectCard.height / 2,
            width: rectCard.width,
            height: rectCard.height,
          })
          setSecondaryCoords({
            x: rectFolder.left + rectFolder.width / 2,
            y: rectFolder.top + rectFolder.height / 2,
            width: rectFolder.width,
            height: rectFolder.height,
          })
        }
      }
    }

    updateTargetCoords()
    window.addEventListener('resize', updateTargetCoords)
    window.addEventListener('scroll', updateTargetCoords, true)
    const interval = setInterval(updateTargetCoords, 400)

    return () => {
      window.removeEventListener('resize', updateTargetCoords)
      window.removeEventListener('scroll', updateTargetCoords, true)
      clearInterval(interval)
    }
  }, [isActive, activeStep, quotes.length, folders.length])

  if (!isActive) return null

  const isVictory = activeStep >= 5
  const currentStepDef = steps.find((s) => s.step === activeStep) || steps[0]

  return (
    <div className="game-tutorial-container" aria-live="polite">
      {/* Top Floating Game HUD Bar */}
      <aside className="tutorial-hud-bar" role="region" aria-label="شريط مهام التدريب التفاعلي">
        <div className="hud-header-strip">
          <div className="hud-badge-group">
            <span className="hud-game-tag">
              <Gamepad2 size={16} />
              <span>طور التدريب التفاعلي</span>
            </span>

            {/* Stepper progress dots */}
            <div className="hud-steps-stepper">
              {steps.map((st) => (
                <button
                  key={st.step}
                  className={`hud-step-chip ${
                    activeStep === st.step
                      ? 'is-active'
                      : activeStep > st.step
                        ? 'is-done'
                        : 'is-upcoming'
                  }`}
                  onClick={() => onSetStep(st.step)}
                  title={`الانتقال إلى: ${st.title}`}
                >
                  {activeStep > st.step ? <CheckCircle2 size={12} /> : st.step}
                  <span className="hud-step-title-peek">{st.title.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="hud-actions-group">
            <button
              className="hud-tool-btn"
              onClick={() => setIsMuted((m) => !m)}
              title={isMuted ? 'تشغيل المؤثرات الصوتية' : 'كتم الصوت'}
              aria-label="تبديل الصوت"
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
            <button
              className="hud-exit-btn"
              onClick={onClose}
              title="إنهاء طور التدريب والعودة للعمل"
              aria-label="إنهاء التدريب"
            >
              <span>إنهاء التدريب</span>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Current Mission Directive Banner */}
        {!isVictory && (
          <div className="hud-directive-box">
            <div className="hud-directive-icon-circle">{currentStepDef.icon}</div>
            <div className="hud-directive-content">
              <div className="hud-directive-title-row">
                <span className="hud-mission-badge">{currentStepDef.shortBadge}</span>
                <strong className="hud-mission-title">{currentStepDef.title}</strong>
              </div>
              <p className="hud-mission-instruction">{currentStepDef.instruction}</p>
            </div>

            <div className="hud-nav-buttons">
              {activeStep > 1 && (
                <button
                  className="hud-nav-btn outline"
                  onClick={onPrevStep}
                  title="المهمة السابقة"
                >
                  <ChevronRight size={14} />
                  السابق
                </button>
              )}
              <button
                className="hud-nav-btn primary"
                onClick={onNextStep}
                title="تخطي لهذه المهمة"
              >
                التالي
                <ChevronLeft size={14} />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Dynamic Animated Hand Pointers and Path Overlays for the Active Step */}
      {!isVictory && targetCoords && (
        <div className="tutorial-live-markers-layer">
          {/* STEP 1: Corner Curl Target Pointer */}
          {activeStep === 1 && (
            <div
              className="tutorial-pointer-beacon corner-beacon"
              style={{
                left: `${targetCoords.x}px`,
                top: `${targetCoords.y}px`,
              }}
            >
              <div className="beacon-ring pulse" />
              <div className="beacon-hand-bounce-down">
                <span className="beacon-tooltip-label">المس زاوية الورقة هنا</span>
                <span className="beacon-hand-emoji">👇</span>
              </div>
            </div>
          )}

          {/* STEP 2: Drag from Card 1 to Card 2 Trajectory */}
          {activeStep === 2 && secondaryCoords && (
            <div className="tutorial-drag-track-overlay">
              {/* Source card pointer */}
              <div
                className="tutorial-pointer-beacon drag-source-beacon"
                style={{
                  left: `${targetCoords.x}px`,
                  top: `${targetCoords.y}px`,
                }}
              >
                <div className="beacon-ring pulse" />
                <div className="beacon-drag-hand">
                  <span>✊</span>
                  <small>اسحب هذا العرض</small>
                </div>
              </div>

              {/* Destination card target */}
              <div
                className="tutorial-pointer-beacon drag-dest-beacon"
                style={{
                  left: `${secondaryCoords.x}px`,
                  top: `${secondaryCoords.y}px`,
                }}
              >
                <div className="beacon-ring target-ring" />
                <div className="beacon-dest-pill">
                  <span>🎯 وأفلته هنا</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Selection Hub Upward Arc Pointer */}
          {activeStep === 3 && (
            <div
              className="tutorial-pointer-beacon hub-beacon"
              style={{
                left: `${targetCoords.x}px`,
                top: `${targetCoords.y}px`,
              }}
            >
              <div className="beacon-ring pulse-large" />
              <div className="beacon-up-arrow-bounce">
                <span className="beacon-up-icon">⬆️</span>
                <span className="beacon-tooltip-label">اسحب كبسولة التحديد للأعلى</span>
              </div>
            </div>
          )}

          {/* STEP 4: Drop into Folder Target */}
          {activeStep === 4 && secondaryCoords && (
            <div className="tutorial-drag-track-overlay">
              <div
                className="tutorial-pointer-beacon drag-source-beacon"
                style={{
                  left: `${targetCoords.x}px`,
                  top: `${targetCoords.y}px`,
                }}
              >
                <div className="beacon-ring pulse" />
                <div className="beacon-drag-hand">
                  <span>📄 اسحب هذه الورقة</span>
                </div>
              </div>

              <div
                className="tutorial-pointer-beacon folder-dest-beacon"
                style={{
                  left: `${secondaryCoords.x}px`,
                  top: `${secondaryCoords.y}px`,
                }}
              >
                <div className="beacon-ring target-ring folder-glow" />
                <div className="beacon-dest-pill folder-dest-pill">
                  <span>📂 أفلت داخل المجلد</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Victory Celebration Modal when all 4 steps are finished */}
      {isVictory && (
        <div className="tutorial-victory-overlay" onClick={onClose} role="dialog" aria-modal="true">
          <div className="tutorial-victory-card" onClick={(e) => e.stopPropagation()}>
            <div className="victory-confetti-emojis">
              <span>🎉</span>
              <span>✨</span>
              <span>🏆</span>
              <span>⭐</span>
            </div>

            <div className="victory-trophy-badge">
              <Trophy size={48} className="trophy-gold-icon" />
            </div>

            <h2 className="victory-title">مبروك! أتقنت جميع الحركات الذكية</h2>
            <p className="victory-subtitle">
              أصبحت الآن محترفاً في إدارة عروضك داخل «طِرَاس»: طي الأوراق، دمج المجلدات بمروحة
              الأونو، القوس الشعاعي، وابتلاع الملفات الفيزيائي!
            </p>

            <div className="victory-skills-checklist">
              <div className="victory-skill-row done">
                <CheckCircle2 size={16} />
                <span>طية الورقة وتحديد العروض (Page Curl)</span>
              </div>
              <div className="victory-skill-row done">
                <CheckCircle2 size={16} />
                <span>دمج عرضين وتشكيل مجلد جديد (Uno Fan)</span>
              </div>
              <div className="victory-skill-row done">
                <CheckCircle2 size={16} />
                <span>مستند التحديد وقوس العمليات السريعة (Radial Arc)</span>
              </div>
              <div className="victory-skill-row done">
                <CheckCircle2 size={16} />
                <span>السحب المباشر وابتلاع الملفات (+1 Absorption)</span>
              </div>
            </div>

            <button className="button primary-button victory-start-btn" onClick={onClose}>
              <Sparkles size={16} />
              <span>جاهز! ابدأ العمل على عروضك الآن</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
