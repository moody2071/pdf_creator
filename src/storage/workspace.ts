import {
  cloneDemoWorkspace,
  type Quote,
  type QuoteFolder,
  type WorkspaceData,
} from '../domain/quote'
import {
  FOLDERS_DIR,
  QUOTES_DIR,
  WORKSPACE_FILE,
  buildWorkspaceIndex,
  createEmptyWorkspace,
  createManifest,
  exportWorkspaceJsonString,
  migrateWorkspace,
  parseImportedWorkspaceJson,
  validateFolder,
  validateQuote,
  type WorkspaceManifest,
} from './validation'
import { createMemoryDirectoryHandle, type MemoryDirectoryControl } from './memory-fs'
import { defaultTestWorkspace } from './default-test-workspace'

export {
  FOLDERS_DIR,
  QUOTES_DIR,
  WORKSPACE_FILE,
  buildWorkspaceIndex,
  createEmptyWorkspace,
  createManifest,
  createMemoryDirectoryHandle,
  exportWorkspaceJsonString,
  migrateWorkspace,
  parseImportedWorkspaceJson,
  validateFolder,
  validateQuote,
  type MemoryDirectoryControl,
  type WorkspaceManifest,
}

const LEGACY_STORAGE_KEY = 'tiras-quotes-workspace-v2'
const RECOVERY_STORAGE_KEY = 'tiras-workspace-recovery-v3'
const HANDLE_DB = 'anfas-workspace-handles'
const HANDLE_STORE = 'handles'
const HANDLE_KEY = 'active-workspace'

export type PermissionMode = 'read' | 'readwrite'

export type DirectoryWithPermission = FileSystemDirectoryHandle & {
  queryPermission?: (descriptor: { mode: PermissionMode }) => Promise<PermissionState>
  requestPermission?: (descriptor: { mode: PermissionMode }) => Promise<PermissionState>
  entries?: () => AsyncIterableIterator<[string, FileSystemHandle]>
  values?: () => AsyncIterableIterator<FileSystemHandle>
}

type WritableFile = FileSystemFileHandle & {
  createWritable: (options?: { keepExistingData?: boolean }) => Promise<FileSystemWritableFileStream>
}

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: { mode?: PermissionMode }) => Promise<FileSystemDirectoryHandle>
  __ANFAS_MOCK_DIRECTORY_PICKER__?: (options?: {
    mode?: PermissionMode
  }) => Promise<FileSystemDirectoryHandle>
}

export interface WorkspaceLink {
  name: string
  data: WorkspaceData
  indexRebuilt?: boolean
  fileCount: number
}

export interface PersistResult {
  ok: boolean
  reason?: 'permission-lost' | 'write-error' | 'no-handle'
  message?: string
  savedAt?: string
  fileCount?: number
  recoverySaved: boolean
}

export interface RecoverySnapshot {
  workspaceId: string
  workspaceName?: string
  updatedAt: string
  pendingSync: boolean
  data: WorkspaceData
}

let memoryHandleFallback: FileSystemDirectoryHandle | null = null

function hasLocalStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null
  } catch {
    return false
  }
}

export function saveRecoverySnapshot(
  data: WorkspaceData,
  pendingSync: boolean,
  workspaceName?: string,
): boolean {
  if (!hasLocalStorage()) return false
  try {
    const snapshot: RecoverySnapshot = {
      workspaceId: data.workspaceId,
      workspaceName,
      updatedAt: new Date().toISOString(),
      pendingSync,
      data,
    }
    localStorage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(snapshot))
    return true
  } catch {
    return false
  }
}

export function loadRecoverySnapshot(): RecoverySnapshot | null {
  if (!hasLocalStorage()) return null
  try {
    const raw = localStorage.getItem(RECOVERY_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<RecoverySnapshot>
    const migrated = migrateWorkspace(parsed.data)
    if (!migrated || typeof parsed.pendingSync !== 'boolean') return null
    return {
      workspaceId: migrated.workspaceId,
      workspaceName: typeof parsed.workspaceName === 'string' ? parsed.workspaceName : undefined,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : migrated.updatedAt,
      pendingSync: parsed.pendingSync,
      data: migrated,
    }
  } catch {
    return null
  }
}

export function loadWorkspace(): WorkspaceData {
  const recovery = loadRecoverySnapshot()
  if (recovery && recovery.pendingSync) {
    return recovery.data
  }
  if (hasLocalStorage()) {
    try {
      const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
      if (raw) {
        const migrated = migrateWorkspace(JSON.parse(raw))
        if (migrated) return migrated
      }
    } catch {
      // Keep the demo usable if browser storage is unavailable or malformed.
    }
  }
  const migratedTest = migrateWorkspace(JSON.parse(JSON.stringify(defaultTestWorkspace)))
  return migratedTest ?? cloneDemoWorkspace()
}

export function saveWorkspace(data: WorkspaceData): boolean {
  if (!hasLocalStorage()) return false
  try {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(data))
    saveRecoverySnapshot(data, false)
    return true
  } catch {
    return false
  }
}

export function supportsDirectoryPicker(): boolean {
  if (typeof window === 'undefined') return false
  const win = window as DirectoryPickerWindow
  return (
    typeof win.showDirectoryPicker === 'function' ||
    typeof win.__ANFAS_MOCK_DIRECTORY_PICKER__ === 'function'
  )
}

function openHandleDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB غير متاح'))
      return
    }
    const request = indexedDB.open(HANDLE_DB, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(HANDLE_STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('تعذر فتح مخزن ربط مساحة العمل'))
  })
}

export async function getSavedHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (memoryHandleFallback) return memoryHandleFallback
  try {
    const db = await openHandleDatabase()
    return await new Promise((resolve, reject) => {
      const request = db
        .transaction(HANDLE_STORE, 'readonly')
        .objectStore(HANDLE_STORE)
        .get(HANDLE_KEY)
      request.onsuccess = () => {
        db.close()
        resolve((request.result as FileSystemDirectoryHandle | undefined) ?? null)
      }
      request.onerror = () => {
        db.close()
        reject(request.error ?? new Error('تعذر استعادة مساحة العمل'))
      }
    })
  } catch {
    return memoryHandleFallback
  }
}

export async function saveHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  memoryHandleFallback = handle
  try {
    const db = await openHandleDatabase()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE, 'readwrite')
      tx.objectStore(HANDLE_STORE).put(handle, HANDLE_KEY)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error ?? new Error('تعذر حفظ ربط المجلد'))
      }
    })
  } catch {
    // Kept in memoryHandleFallback when IndexedDB cannot clone custom/mock handles.
  }
}

export async function clearSavedHandle(): Promise<void> {
  memoryHandleFallback = null
  try {
    const db = await openHandleDatabase()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE, 'readwrite')
      tx.objectStore(HANDLE_STORE).delete(HANDLE_KEY)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error ?? new Error('تعذر مسح ربط المجلد'))
      }
    })
  } catch {
    // Ignore if IndexedDB is unavailable.
  }
}

export async function ensurePermission(
  handle: FileSystemDirectoryHandle,
  ask = false,
): Promise<boolean> {
  const permitted = handle as DirectoryWithPermission
  if (typeof permitted.queryPermission !== 'function') return true
  let state = await permitted.queryPermission({ mode: 'readwrite' })
  if (state === 'prompt' && ask && typeof permitted.requestPermission === 'function') {
    state = await permitted.requestPermission({ mode: 'readwrite' })
  }
  return state === 'granted'
}

async function writeJsonFile(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
  payload: unknown,
): Promise<void> {
  const serialized = `${JSON.stringify(payload, null, 2)}\n`
  let lastError: unknown

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fileHandle = (await dirHandle.getFileHandle(fileName, {
        create: true,
      })) as WritableFile
      const writable = await fileHandle.createWritable({ keepExistingData: false })
      try {
        await writable.write(serialized)
        await writable.close()
        return
      } catch (error) {
        try {
          await writable.abort()
        } catch {
          // Ignore secondary abort error
        }
        throw error
      }
    } catch (error) {
      lastError = error
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }
  }

  throw lastError
}

async function listDirectoryFileHandles(
  dirHandle: FileSystemDirectoryHandle,
): Promise<Array<[string, FileSystemFileHandle]>> {
  const iterable = dirHandle as DirectoryWithPermission
  const result: Array<[string, FileSystemFileHandle]> = []
  if (typeof iterable.entries === 'function') {
    for await (const [name, entry] of iterable.entries()) {
      if (entry.kind === 'file') {
        result.push([name, entry as FileSystemFileHandle])
      }
    }
  } else if (typeof iterable.values === 'function') {
    for await (const entry of iterable.values()) {
      if (entry.kind === 'file') {
        result.push([entry.name, entry as FileSystemFileHandle])
      }
    }
  }
  return result
}

export async function writeQuoteFile(
  rootHandle: FileSystemDirectoryHandle,
  quote: Quote,
): Promise<void> {
  const valid = validateQuote(quote)
  if (!valid) throw new Error('بيانات العرض غير صالحة للحفظ.')
  const quotesDir = await rootHandle.getDirectoryHandle(QUOTES_DIR, { create: true })
  await writeJsonFile(quotesDir, `${valid.id}.json`, valid)
}

export async function readQuoteFile(
  rootHandle: FileSystemDirectoryHandle,
  quoteId: string,
): Promise<Quote | null> {
  try {
    const quotesDir = await rootHandle.getDirectoryHandle(QUOTES_DIR, { create: false })
    const fileHandle = await quotesDir.getFileHandle(`${quoteId}.json`, { create: false })
    const file = await fileHandle.getFile()
    return validateQuote(JSON.parse(await file.text()))
  } catch {
    return null
  }
}

export async function deleteQuoteFile(
  rootHandle: FileSystemDirectoryHandle,
  quoteId: string,
): Promise<boolean> {
  try {
    const quotesDir = await rootHandle.getDirectoryHandle(QUOTES_DIR, { create: false })
    await quotesDir.removeEntry(`${quoteId}.json`)
    return true
  } catch {
    return false
  }
}

export async function writeFolderFile(
  rootHandle: FileSystemDirectoryHandle,
  folder: QuoteFolder,
): Promise<void> {
  const valid = validateFolder(folder)
  if (!valid) throw new Error('بيانات المجلد غير صالحة للحفظ.')
  const foldersDir = await rootHandle.getDirectoryHandle(FOLDERS_DIR, { create: true })
  await writeJsonFile(foldersDir, `${valid.id}.json`, valid)
}

export async function deleteFolderFile(
  rootHandle: FileSystemDirectoryHandle,
  folderId: string,
): Promise<boolean> {
  try {
    const foldersDir = await rootHandle.getDirectoryHandle(FOLDERS_DIR, { create: false })
    await foldersDir.removeEntry(`${folderId}.json`)
    return true
  } catch {
    return false
  }
}

export async function syncWorkspaceFiles(
  rootHandle: FileSystemDirectoryHandle,
  data: WorkspaceData,
): Promise<{ fileCount: number; updatedAt: string }> {
  const validated = migrateWorkspace(data)
  if (!validated) {
    throw new Error('رفض الحفظ لأن مخطط البيانات غير صالح.')
  }

  const quotesDir = await rootHandle.getDirectoryHandle(QUOTES_DIR, { create: true })
  const foldersDir = await rootHandle.getDirectoryHandle(FOLDERS_DIR, { create: true })

  for (const folder of validated.folders) {
    await writeJsonFile(foldersDir, `${folder.id}.json`, folder)
  }
  for (const quote of validated.quotes) {
    await writeJsonFile(quotesDir, `${quote.id}.json`, quote)
  }

  const desiredQuoteFiles = new Set(validated.quotes.map((q) => `${q.id}.json`))
  const existingQuoteFiles = await listDirectoryFileHandles(quotesDir)
  for (const [name] of existingQuoteFiles) {
    if (name.endsWith('.json') && !desiredQuoteFiles.has(name)) {
      await quotesDir.removeEntry(name)
    }
  }

  const desiredFolderFiles = new Set(validated.folders.map((f) => `${f.id}.json`))
  const existingFolderFiles = await listDirectoryFileHandles(foldersDir)
  for (const [name] of existingFolderFiles) {
    if (name.endsWith('.json') && !desiredFolderFiles.has(name)) {
      await foldersDir.removeEntry(name)
    }
  }

  const now = new Date().toISOString()
  const manifest = createManifest(validated, now)
  await writeJsonFile(rootHandle, WORKSPACE_FILE, manifest)

  return {
    fileCount: validated.quotes.length + validated.folders.length + 1,
    updatedAt: now,
  }
}

async function scanEntityFiles(
  rootHandle: FileSystemDirectoryHandle,
): Promise<{ quotes: Quote[]; folders: QuoteFolder[]; hadDirectoryEntries: boolean }> {
  const quotes: Quote[] = []
  const folders: QuoteFolder[] = []
  let hadDirectoryEntries = false

  try {
    const foldersDir = await rootHandle.getDirectoryHandle(FOLDERS_DIR, { create: false })
    const folderFiles = await listDirectoryFileHandles(foldersDir)
    if (folderFiles.length > 0) hadDirectoryEntries = true
    for (const [name, fileHandle] of folderFiles) {
      if (!name.endsWith('.json')) continue
      try {
        const text = await (await fileHandle.getFile()).text()
        const valid = validateFolder(JSON.parse(text))
        if (valid) folders.push(valid)
      } catch {
        // Skip unreadable individual file during scan
      }
    }
  } catch {
    // Subdirectory does not exist yet
  }

  try {
    const quotesDir = await rootHandle.getDirectoryHandle(QUOTES_DIR, { create: false })
    const quoteFiles = await listDirectoryFileHandles(quotesDir)
    if (quoteFiles.length > 0) hadDirectoryEntries = true
    for (const [name, fileHandle] of quoteFiles) {
      if (!name.endsWith('.json')) continue
      try {
        const text = await (await fileHandle.getFile()).text()
        const valid = validateQuote(JSON.parse(text))
        if (valid) quotes.push(valid)
      } catch {
        // Skip unreadable individual file during scan
      }
    }
  } catch {
    // Subdirectory does not exist yet
  }

  quotes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.number.localeCompare(a.number))
  return { quotes, folders, hadDirectoryEntries }
}

export async function rebuildWorkspaceIndex(
  rootHandle: FileSystemDirectoryHandle,
): Promise<{ data: WorkspaceData; fileCount: number }> {
  let existingWorkspaceId: string = crypto.randomUUID()
  let manifestWorkspace: WorkspaceData | null = null

  try {
    const manifestHandle = await rootHandle.getFileHandle(WORKSPACE_FILE, { create: false })
    const manifestFile = await manifestHandle.getFile()
    if (manifestFile.size > 0) {
      const parsed: unknown = JSON.parse(await manifestFile.text())
      manifestWorkspace = migrateWorkspace(parsed)
      if (manifestWorkspace) {
        existingWorkspaceId = manifestWorkspace.workspaceId
      }
    }
  } catch {
    // Index file missing or unreadable; will rebuild from entity files
  }

  const scanned = await scanEntityFiles(rootHandle)
  let targetData: WorkspaceData | null = null

  if (scanned.hadDirectoryEntries && (scanned.quotes.length > 0 || scanned.folders.length > 0)) {
    targetData = migrateWorkspace({
      schemaVersion: 2,
      workspaceId: existingWorkspaceId,
      updatedAt: new Date().toISOString(),
      quotes: scanned.quotes,
      folders: scanned.folders,
    })
  }

  if (!targetData && manifestWorkspace) {
    targetData = manifestWorkspace
  }

  if (!targetData) {
    targetData = createEmptyWorkspace(existingWorkspaceId)
  }

  const synced = await syncWorkspaceFiles(rootHandle, targetData)
  return { data: { ...targetData, updatedAt: synced.updatedAt }, fileCount: synced.fileCount }
}

export async function readOrInitialize(
  handle: FileSystemDirectoryHandle,
): Promise<{ data: WorkspaceData; indexRebuilt: boolean; fileCount: number }> {
  let manifestText = ''
  let manifestExists = false

  try {
    const fileHandle = await handle.getFileHandle(WORKSPACE_FILE, { create: false })
    const file = await fileHandle.getFile()
    if (file.size > 0) {
      manifestExists = true
      manifestText = await file.text()
    }
  } catch {
    manifestExists = false
  }

  const scanned = await scanEntityFiles(handle)

  if (!manifestExists) {
    if (scanned.hadDirectoryEntries && (scanned.quotes.length > 0 || scanned.folders.length > 0)) {
      const rebuilt = await rebuildWorkspaceIndex(handle)
      return { data: rebuilt.data, indexRebuilt: true, fileCount: rebuilt.fileCount }
    }
    const fresh = createEmptyWorkspace()
    const synced = await syncWorkspaceFiles(handle, fresh)
    return { data: fresh, indexRebuilt: false, fileCount: synced.fileCount }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(manifestText)
  } catch {
    if (scanned.hadDirectoryEntries && (scanned.quotes.length > 0 || scanned.folders.length > 0)) {
      const rebuilt = await rebuildWorkspaceIndex(handle)
      return { data: rebuilt.data, indexRebuilt: true, fileCount: rebuilt.fileCount }
    }
    throw new Error('ملف مساحة العمل تالف ولا يحتوي على JSON صالح. لم يتم استبداله.')
  }

  const workspace = migrateWorkspace(parsed)
  if (!workspace) {
    if (scanned.hadDirectoryEntries && (scanned.quotes.length > 0 || scanned.folders.length > 0)) {
      const rebuilt = await rebuildWorkspaceIndex(handle)
      return { data: rebuilt.data, indexRebuilt: true, fileCount: rebuilt.fileCount }
    }
    throw new Error('ملف مساحة العمل لا يحتوي على بيانات معروفة. لم يتم استبداله.')
  }

  const countsMismatch =
    scanned.hadDirectoryEntries &&
    (scanned.quotes.length !== workspace.quotes.length ||
      scanned.folders.length !== workspace.folders.length)

  if (countsMismatch) {
    const rebuilt = await rebuildWorkspaceIndex(handle)
    return { data: rebuilt.data, indexRebuilt: true, fileCount: rebuilt.fileCount }
  }

  const needsMigrationOrSync =
    (parsed as { schemaVersion?: number }).schemaVersion !== 2 || !scanned.hadDirectoryEntries
  if (needsMigrationOrSync) {
    const synced = await syncWorkspaceFiles(handle, workspace)
    return { data: workspace, indexRebuilt: false, fileCount: synced.fileCount }
  }

  return {
    data: workspace,
    indexRebuilt: false,
    fileCount: workspace.quotes.length + workspace.folders.length + 1,
  }
}

export async function reconnectWorkspace(
  requestPermission = false,
  pendingDataToFlush?: WorkspaceData | null,
): Promise<WorkspaceLink | null> {
  const handle = await getSavedHandle()
  if (!handle || !(await ensurePermission(handle, requestPermission))) return null

  if (pendingDataToFlush) {
    const synced = await syncWorkspaceFiles(handle, pendingDataToFlush)
    saveRecoverySnapshot(pendingDataToFlush, false, handle.name)
    saveWorkspace(pendingDataToFlush)
    return {
      name: handle.name,
      data: { ...pendingDataToFlush, updatedAt: synced.updatedAt },
      indexRebuilt: false,
      fileCount: synced.fileCount,
    }
  }

  const loaded = await readOrInitialize(handle)
  saveRecoverySnapshot(loaded.data, false, handle.name)
  saveWorkspace(loaded.data)
  return {
    name: handle.name,
    data: loaded.data,
    indexRebuilt: loaded.indexRebuilt,
    fileCount: loaded.fileCount,
  }
}

export async function hasSavedWorkspaceLink(): Promise<boolean> {
  return Boolean(await getSavedHandle())
}

export async function chooseWorkspaceFolder(options?: {
  initializeWith?: WorkspaceData
}): Promise<WorkspaceLink> {
  const win = window as DirectoryPickerWindow
  const picker = win.__ANFAS_MOCK_DIRECTORY_PICKER__ ?? win.showDirectoryPicker
  if (!picker) {
    throw new Error(
      'متصفحك لا يدعم اختيار مجلد مباشر. استخدم تصدير/استيراد ملف البيانات أو المساحة المؤقتة.',
    )
  }
  const handle = await picker.call(window, { mode: 'readwrite' })
  if (!(await ensurePermission(handle, true))) {
    throw new Error('لم يُمنح إذن الكتابة إلى المجلد.')
  }

  if (options?.initializeWith) {
    const synced = await syncWorkspaceFiles(handle, options.initializeWith)
    await saveHandle(handle)
    saveRecoverySnapshot(options.initializeWith, false, handle.name)
    saveWorkspace(options.initializeWith)
    return {
      name: handle.name,
      data: { ...options.initializeWith, updatedAt: synced.updatedAt },
      indexRebuilt: false,
      fileCount: synced.fileCount,
    }
  }

  const loaded = await readOrInitialize(handle)
  await saveHandle(handle)
  saveRecoverySnapshot(loaded.data, false, handle.name)
  saveWorkspace(loaded.data)
  return {
    name: handle.name,
    data: loaded.data,
    indexRebuilt: loaded.indexRebuilt,
    fileCount: loaded.fileCount,
  }
}

export async function rebuildLinkedWorkspaceIndex(): Promise<WorkspaceLink> {
  const handle = await getSavedHandle()
  if (!handle) throw new Error('لا يوجد مجلد مرتبط لإعادة بناء فهرسه.')
  if (!(await ensurePermission(handle, true))) {
    throw new Error('يلزم منح إذن القراءة والكتابة لإعادة بناء الفهرس.')
  }
  const rebuilt = await rebuildWorkspaceIndex(handle)
  saveRecoverySnapshot(rebuilt.data, false, handle.name)
  saveWorkspace(rebuilt.data)
  return {
    name: handle.name,
    data: rebuilt.data,
    indexRebuilt: true,
    fileCount: rebuilt.fileCount,
  }
}

export async function persistWorkspaceToFolder(data: WorkspaceData): Promise<PersistResult> {
  const recoverySaved = saveRecoverySnapshot(data, true)
  const handle = await getSavedHandle()
  if (!handle) {
    return {
      ok: false,
      reason: 'no-handle',
      message: 'لا يوجد مجلد مرتبط حاليًا. حُفظت التعديلات في الذاكرة المؤقتة.',
      recoverySaved,
    }
  }
  const permitted = await ensurePermission(handle, false)
  if (!permitted) {
    return {
      ok: false,
      reason: 'permission-lost',
      message:
        'انقطع إذن الوصول إلى المجلد. آخر التعديلات محفوظة مؤقتًا وتحتاج إعادة ربط المجلد.',
      recoverySaved,
    }
  }
  try {
    const synced = await syncWorkspaceFiles(handle, data)
    saveRecoverySnapshot(data, false, handle.name)
    saveWorkspace(data)
    return {
      ok: true,
      savedAt: synced.updatedAt,
      fileCount: synced.fileCount,
      recoverySaved: true,
    }
  } catch (error) {
    return {
      ok: false,
      reason: 'write-error',
      message:
        error instanceof Error
          ? `تعذر الكتابة إلى المجلد (${error.message}). لم تُفقد تعديلاتك وهي محفوظة مؤقتًا.`
          : 'تعذر الكتابة إلى المجلد. لم تُفقد تعديلاتك وهي محفوظة مؤقتًا.',
      recoverySaved,
    }
  }
}
