import { type ChangeEvent, type RefObject } from 'react'
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Download,
  FilePlus2,
  FolderPlus,
  Gamepad2,
  HardDrive,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { supportsDirectoryPicker } from '../../storage/workspace'
import { type SaveState, type Screen, type WorkspaceMode } from '../types'

export interface GlobalBarProps {
  folderId: string | null
  isTrashView: boolean
  trashedCount: number
  query: string
  screen: Screen
  workspaceMode: WorkspaceMode
  saveState: SaveState
  workspaceMenuOpen: boolean
  workspaceName: string
  saveErrorMessage: string | null
  connectionStatusText: string
  lastSavedAt: string | null
  workspaceId: string
  searchInputRef: RefObject<HTMLInputElement>
  fileInputRef: RefObject<HTMLInputElement>
  setScreen: (screen: Screen) => void
  setIsTrashView: (val: boolean) => void
  setFolderId: (id: string | null) => void
  setQuery: (q: string) => void
  setWorkspaceMenuOpen: (fn: boolean | ((open: boolean) => boolean)) => void
  createFolder: () => void
  emptyTrash: () => void
  handleRetrySave: () => void
  handleExportJson: () => void
  handleReconnectFolder: () => void
  handleChooseFolder: (empty: boolean) => void
  handleRebuildIndex: () => void
  handleImportJsonFile: (event: ChangeEvent<HTMLInputElement>) => void
  handleSwitchToMemoryDemo: () => void
  onOpenGestureTips?: () => void
}

export function GlobalBar({
  folderId,
  isTrashView,
  trashedCount,
  query,
  screen,
  workspaceMode,
  saveState,
  workspaceMenuOpen,
  workspaceName,
  saveErrorMessage,
  connectionStatusText,
  lastSavedAt,
  workspaceId,
  searchInputRef,
  fileInputRef,
  setScreen,
  setIsTrashView,
  setFolderId,
  setQuery,
  setWorkspaceMenuOpen,
  createFolder,
  emptyTrash,
  handleRetrySave,
  handleExportJson,
  handleReconnectFolder,
  handleChooseFolder,
  handleRebuildIndex,
  handleImportJsonFile,
  handleSwitchToMemoryDemo,
  onOpenGestureTips,
}: GlobalBarProps) {
  return (
    <header className="global-bar">
      <button
        className="brand-lockup"
        onClick={() => {
          setScreen('library')
          setIsTrashView(false)
          setFolderId(null)
        }}
      >
        <span className="brand-mark">ط</span>
        <span>
          <b>طِرَاس</b>
        </span>
      </button>

      {/* Quick Actions placed on the RIGHT for rapid access */}
      <div className="global-actions">
        {(folderId !== null || isTrashView) && (
          <button
            className="button outline-button global-btn-back"
            onClick={() => {
              setFolderId(null)
              setIsTrashView(false)
            }}
            title="الرجوع إلى مساحة العمل الرئيسية"
            aria-label="رجوع"
          >
            <ChevronRight size={16} />
            <span className="global-btn-txt">رجوع</span>
          </button>
        )}

        <button
          className="button primary-button global-btn-quote"
          onClick={() => setScreen('templates')}
          title={folderId ? 'إنشاء عرض جديد داخل هذا المجلد' : 'إنشاء عرض سعر جديد'}
          aria-label="عرض جديد"
        >
          <FilePlus2 size={16} />
          <span className="global-btn-txt">عرض جديد</span>
        </button>

        {!isTrashView && folderId === null && (
          <button
            className="button outline-button global-btn-folder"
            onClick={() => createFolder()}
            title="إنشاء مجلد جديد"
            aria-label="مجلد جديد"
          >
            <FolderPlus size={16} />
            <span className="global-btn-txt">مجلد جديد</span>
          </button>
        )}

        {isTrashView && trashedCount > 0 && (
          <button
            className="button danger-button global-btn-empty-trash"
            onClick={emptyTrash}
            title="تفريغ سلة المحذوفات نهائيًا"
          >
            <Trash2 size={14} />
            <span className="global-btn-txt">إفراغ السلة</span>
          </button>
        )}

        {/* Game-like Interactive Quest / Gestures Tutorial */}
        {onOpenGestureTips && (
          <button
            className="button outline-button global-btn-tips"
            onClick={onOpenGestureTips}
            title="طور التدريب التفاعلي: تعلّم الحركات الذكية كالألعاب"
            aria-label="طور التدريب التفاعلي"
          >
            <Gamepad2 size={16} className="tips-gamepad-icon" />
            <span className="global-btn-txt">تدريب الحركات</span>
          </button>
        )}
      </div>

      <label className="global-search">
        <Search size={17} />
        <input
          ref={searchInputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            if (screen !== 'library') setScreen('library')
          }}
          placeholder="ابحث عن عرض أو عميل أو بند… (⌘K)"
        />
        <kbd dir="ltr">⌘ K</kbd>
      </label>

      <div className="workspace-menu-container">
        <button
          className={`workspace-connection ${
            workspaceMode !== 'folder' || saveState !== 'saved' ? 'unlinked' : ''
          } ${saveState === 'pending-reconnect' || saveState === 'write-error' ? 'warning' : ''}`}
          onClick={() => setWorkspaceMenuOpen((open) => !open)}
          aria-expanded={workspaceMenuOpen}
          aria-label={`مصدر الحفظ: ${workspaceName}`}
          title={saveErrorMessage ?? connectionStatusText}
        >
          <span
            className={`connection-dot ${
              workspaceMode === 'folder' && saveState === 'saved'
                ? 'ok'
                : saveState === 'saving'
                  ? 'syncing'
                  : workspaceMode === 'reconnect' || saveState === 'write-error'
                    ? 'warn'
                    : 'temp'
            }`}
          />
          <span className="workspace-name-label" title={workspaceName}>
            {workspaceName}
          </span>
          <ChevronDown size={13} className="workspace-chevron" />
          <i className="workspace-divider" />
          <span className="muted workspace-muted">{connectionStatusText}</span>
        </button>

        {(workspaceMode === 'reconnect' ||
          saveState === 'write-error' ||
          saveState === 'pending-reconnect') && (
          <div className="workspace-sync-actions" role="group" aria-label="إجراءات الحفظ والمزامنة">
            <button
              className="button primary-button quick-sync-btn"
              onClick={(e) => {
                e.stopPropagation()
                handleRetrySave()
              }}
              title={
                workspaceMode === 'reconnect'
                  ? 'إعادة ربط المجلد ومزامنة التعديلات'
                  : 'إعادة محاولة المزامنة والحفظ في المجلد'
              }
            >
              <RefreshCw size={12} className={saveState === 'saving' ? 'spin-animation' : ''} />
              <span>{workspaceMode === 'reconnect' ? 'إعادة ربط' : 'مزامنة'}</span>
            </button>

            <button
              className="button outline-button quick-backup-btn"
              onClick={(e) => {
                e.stopPropagation()
                handleExportJson()
              }}
              title="تنزيل وتصدير نسخة احتياطية من التعديلات (JSON)"
            >
              <Download size={12} />
              <span>حفظ نسخة</span>
            </button>
          </div>
        )}

        {workspaceMenuOpen && (
          <div className="workspace-popover" role="dialog" aria-label="إعدادات مساحة العمل والتخزين">
            <div className="workspace-popover-head">
              <div>
                <b>مصدر الحفظ ومساحة العمل</b>
                <small>{connectionStatusText}</small>
              </div>
              <button
                className="icon-button"
                aria-label="إغلاق قائمة مساحة العمل"
                onClick={() => setWorkspaceMenuOpen(false)}
              >
                <X size={14} />
              </button>
            </div>

            {(workspaceMode === 'reconnect' ||
              saveState === 'write-error' ||
              saveState === 'pending-reconnect') &&
              saveErrorMessage && (
                <div className="workspace-popover-alert">
                  <AlertCircle size={15} />
                  <span>{saveErrorMessage}</span>
                </div>
              )}

            {lastSavedAt && (
              <div className="workspace-meta-row">
                <span>معرّف المساحة: {workspaceId.slice(0, 8)}</span>
                <span>
                  آخر تحديث:{' '}
                  {new Intl.DateTimeFormat('ar-SA', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  }).format(new Date(lastSavedAt))}
                </span>
              </div>
            )}

            <div className="workspace-popover-actions">
              {workspaceMode === 'reconnect' && (
                <button className="popover-action primary" onClick={handleReconnectFolder}>
                  <RefreshCw size={15} />
                  <div>
                    <b>إعادة ربط المجلد وحفظ التعديلات</b>
                    <small>استعادة إذن الكتابة ومزامنة التعديلات المحفوظة مؤقتًا</small>
                  </div>
                </button>
              )}

              {supportsDirectoryPicker() ? (
                <>
                  <button className="popover-action" onClick={() => handleChooseFolder(false)}>
                    <FolderPlus size={15} />
                    <div>
                      <b>اختيار مجلد مساحة عمل من الجهاز</b>
                      <small>فتح مجلد حالي أو تهيئة ملفات مساحة العمل داخله</small>
                    </div>
                  </button>
                  <button className="popover-action" onClick={() => handleChooseFolder(true)}>
                    <FilePlus2 size={15} />
                    <div>
                      <b>إنشاء مساحة فارغة جديدة في مجلد</b>
                      <small>بدء مساحة جديدة بملف فهرس ومجلدات بيانات نظيفة</small>
                    </div>
                  </button>
                </>
              ) : (
                <div className="unsupported-picker-note">
                  متصفحك الحالي لا يدعم File System Access API. استخدم تصدير واستيراد ملف JSON أدناه لحفظ عملك على جهازك.
                </div>
              )}

              {workspaceMode === 'folder' && (
                <button className="popover-action" onClick={handleRebuildIndex}>
                  <RefreshCw size={15} />
                  <div>
                    <b>فحص الملفات وإعادة بناء الفهرس</b>
                    <small>قراءة ملفات العروض والمجلدات وتحديث anfas-workspace.json</small>
                  </div>
                </button>
              )}

              <button className="popover-action" onClick={handleExportJson}>
                <Download size={15} />
                <div>
                  <b>تصدير ملف البيانات (JSON)</b>
                  <small>تنزيل نسخة كاملة من الفهرس والعروض على جهازك</small>
                </div>
              </button>

              <button className="popover-action" onClick={() => fileInputRef.current?.click()}>
                <Upload size={15} />
                <div>
                  <b>استيراد ملف بيانات (JSON)</b>
                  <small>فتح ملف مساحة عمل محفوظ مسبقًا بعد التحقق من صحته</small>
                </div>
              </button>

              <button className="popover-action" onClick={handleSwitchToMemoryDemo}>
                <HardDrive size={15} />
                <div>
                  <b>مساحة تجريبية في الذاكرة (للتطوير)</b>
                  <small>بيانات مثال مؤقتة في الذاكرة دون الكتابة على القرص</small>
                </div>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={handleImportJsonFile}
            />
          </div>
        )}
      </div>
    </header>
  )
}
