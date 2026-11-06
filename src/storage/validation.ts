import {
  QUOTE_STATUSES,
  calculateQuote,
  type Quote,
  type QuoteFolder,
  type QuoteStatus,
  type WorkspaceData,
  type WorkspaceQuoteIndexEntry,
} from '../domain/quote'

export const WORKSPACE_FILE = 'anfas-workspace.json'
export const QUOTES_DIR = 'quotes'
export const FOLDERS_DIR = 'folders'

export interface WorkspaceManifest extends WorkspaceData {
  index: {
    rebuiltAt: string
    quoteCount: number
    folderCount: number
    entries: WorkspaceQuoteIndexEntry[]
  }
}

export function createEmptyWorkspace(workspaceId: string = crypto.randomUUID()): WorkspaceData {
  return {
    schemaVersion: 2,
    workspaceId,
    updatedAt: new Date().toISOString(),
    quotes: [],
    folders: [],
  }
}

export function buildWorkspaceIndex(data: WorkspaceData): WorkspaceQuoteIndexEntry[] {
  return data.quotes.map((quote) => ({
    id: quote.id,
    number: quote.number,
    title: quote.title,
    client: quote.client,
    status: quote.status,
    folderId: quote.folderId,
    updatedAt: quote.updatedAt,
    ...(quote.deletedAt ? { deletedAt: quote.deletedAt } : {}),
    total: calculateQuote(quote).total,
    fileName: `${QUOTES_DIR}/${quote.id}.json`,
  }))
}

export function createManifest(
  data: WorkspaceData,
  timestamp = new Date().toISOString(),
): WorkspaceManifest {
  const entries = buildWorkspaceIndex(data)
  return {
    ...data,
    updatedAt: timestamp,
    index: {
      rebuiltAt: timestamp,
      quoteCount: data.quotes.length,
      folderCount: data.folders.length,
      entries,
    },
  }
}

const VALID_STATUS_SET = new Set<string>(QUOTE_STATUSES)

export function validateQuote(value: unknown): Quote | null {
  if (!value || typeof value !== 'object') return null
  const q = value as Partial<Quote>
  if (
    typeof q.id !== 'string' ||
    !q.id.trim() ||
    typeof q.number !== 'string' ||
    !q.number.trim() ||
    typeof q.title !== 'string' ||
    typeof q.client !== 'string' ||
    typeof q.status !== 'string' ||
    !VALID_STATUS_SET.has(q.status) ||
    !(q.folderId === null || typeof q.folderId === 'string') ||
    typeof q.updatedAt !== 'string' ||
    typeof q.accent !== 'string' ||
    !Array.isArray(q.items)
  ) {
    return null
  }
  const itemsValid = q.items.every(
    (item) =>
      Boolean(item) &&
      typeof item.id === 'string' &&
      item.id.trim().length > 0 &&
      typeof item.title === 'string' &&
      Number.isFinite(item.quantity) &&
      item.quantity >= 0 &&
      Number.isFinite(item.unitPrice) &&
      item.unitPrice >= 0,
  )
  if (!itemsValid) return null
  const snap = q.templateSnapshot
  if (
    !snap ||
    typeof snap !== 'object' ||
    typeof snap.id !== 'string' ||
    typeof snap.name !== 'string' ||
    !Number.isInteger(snap.version) ||
    snap.version < 1
  ) {
    return null
  }
  const itemIds = q.items.map((item) => item.id)
  if (new Set(itemIds).size !== itemIds.length) return null

  return {
    id: q.id,
    number: q.number,
    title: q.title,
    client: q.client,
    ...(q.clientInfo && typeof q.clientInfo === 'object' ? { clientInfo: { ...q.clientInfo } } : {}),
    ...(typeof q.summary === 'string' ? { summary: q.summary } : {}),
    ...(typeof q.createdAt === 'string' ? { createdAt: q.createdAt } : {}),
    ...(typeof q.deletedAt === 'string' ? { deletedAt: q.deletedAt } : {}),
    status: q.status as QuoteStatus,
    folderId: q.folderId,
    updatedAt: q.updatedAt,
    accent: q.accent,
    items: q.items.map((item) => ({
      id: item.id,
      title: item.title,
      ...(typeof item.description === 'string' ? { description: item.description } : {}),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      ...(item.pageBreakBefore === true ? { pageBreakBefore: true } : {}),
    })),
    ...(q.moneyRules &&
    typeof q.moneyRules === 'object' &&
    Number.isFinite(q.moneyRules.taxRate) &&
    Number.isFinite(q.moneyRules.discountAmount)
      ? {
          moneyRules: {
            currency: 'SAR',
            fractionDigits: 2,
            taxRate: Math.max(0, q.moneyRules.taxRate),
            discountAmount: Math.max(0, q.moneyRules.discountAmount),
            ...(Number.isFinite(q.moneyRules.discountPercent)
              ? { discountPercent: Math.min(100, Math.max(0, q.moneyRules.discountPercent!)) }
              : {}),
            ...(q.moneyRules.discountType === 'percent' || q.moneyRules.discountType === 'amount'
              ? { discountType: q.moneyRules.discountType }
              : {}),
          },
        }
      : {}),
    ...(Array.isArray(q.paymentSchedule)
      ? {
          paymentSchedule: q.paymentSchedule.map((m) => ({
            id: typeof m.id === 'string' ? m.id : crypto.randomUUID(),
            name: typeof m.name === 'string' ? m.name : '',
            percentage: Number.isFinite(m.percentage) ? m.percentage : 0,
            amount: Number.isFinite(m.amount) ? m.amount : 0,
            ...(typeof m.notes === 'string' ? { notes: m.notes } : {}),
          })),
        }
      : {}),
    ...(q.termsInfo && typeof q.termsInfo === 'object'
      ? {
          termsInfo: {
            validityDays: Number.isFinite(q.termsInfo.validityDays) ? q.termsInfo.validityDays : 15,
            terms: Array.isArray(q.termsInfo.terms)
              ? q.termsInfo.terms.filter((t): t is string => typeof t === 'string')
              : [],
            ...(q.termsInfo.bankInfo && typeof q.termsInfo.bankInfo === 'object'
              ? {
                  bankInfo: {
                    bankName: String(q.termsInfo.bankInfo.bankName ?? ''),
                    accountName: String(q.termsInfo.bankInfo.accountName ?? ''),
                    iban: String(q.termsInfo.bankInfo.iban ?? ''),
                  },
                }
              : {}),
            ...(typeof q.termsInfo.notes === 'string' ? { notes: q.termsInfo.notes } : {}),
          },
        }
      : {}),
    ...(q.pageSettings && typeof q.pageSettings === 'object'
      ? {
          pageSettings: {
            marginPreset:
              q.pageSettings.marginPreset === 'compact' || q.pageSettings.marginPreset === 'spacious'
                ? q.pageSettings.marginPreset
                : 'normal',
            repeatTableHeader: q.pageSettings.repeatTableHeader !== false,
            ...(q.pageSettings.breakBeforeMilestones ? { breakBeforeMilestones: true } : {}),
            ...(q.pageSettings.breakBeforeTerms ? { breakBeforeTerms: true } : {}),
            ...(q.pageSettings.breakBeforeSignatures ? { breakBeforeSignatures: true } : {}),
          },
        }
      : {}),
    templateSnapshot: {
      id: snap.id,
      name: snap.name,
      version: snap.version,
      ...(typeof snap.accent === 'string' ? { accent: snap.accent } : {}),
      ...(snap.moneyRules &&
      typeof snap.moneyRules === 'object' &&
      Number.isFinite(snap.moneyRules.taxRate) &&
      Number.isFinite(snap.moneyRules.discountAmount)
        ? {
            moneyRules: {
              currency: 'SAR',
              fractionDigits: 2,
              taxRate: Math.max(0, snap.moneyRules.taxRate),
              discountAmount: Math.max(0, snap.moneyRules.discountAmount),
              ...(Number.isFinite(snap.moneyRules.discountPercent)
                ? { discountPercent: Math.min(100, Math.max(0, snap.moneyRules.discountPercent!)) }
                : {}),
              ...(snap.moneyRules.discountType === 'percent' || snap.moneyRules.discountType === 'amount'
                ? { discountType: snap.moneyRules.discountType }
                : {}),
            },
          }
        : {}),
    },
  }
}

export function validateFolder(value: unknown): QuoteFolder | null {
  if (!value || typeof value !== 'object') return null
  const f = value as Partial<QuoteFolder>
  if (
    typeof f.id !== 'string' ||
    !f.id.trim() ||
    typeof f.name !== 'string' ||
    !f.name.trim() ||
    typeof f.color !== 'string'
  ) {
    return null
  }
  const color =
    f.color === '#dcece5'
      ? '#007aff'
      : f.color === '#f5e8d8'
        ? '#af52de'
        : f.color
  return { id: f.id, name: f.name, color }
}

export function migrateWorkspace(value: unknown): WorkspaceData | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as {
    schemaVersion?: number
    workspaceId?: string
    updatedAt?: string
    quotes?: unknown[]
    folders?: unknown[]
  }
  if (!Array.isArray(candidate.quotes) || !Array.isArray(candidate.folders)) return null

  const quotes: Quote[] = []
  for (const rawQuote of candidate.quotes) {
    const valid = validateQuote(rawQuote)
    if (!valid) return null
    quotes.push(valid)
  }

  const folders: QuoteFolder[] = []
  for (const rawFolder of candidate.folders) {
    const valid = validateFolder(rawFolder)
    if (!valid) return null
    folders.push(valid)
  }

  const ids = [...quotes.map((quote) => quote.id), ...folders.map((folder) => folder.id)]
  const quoteNumbers = quotes.map((quote) => quote.number)
  if (new Set(ids).size !== ids.length || new Set(quoteNumbers).size !== quoteNumbers.length) {
    return null
  }

  const folderIdSet = new Set(folders.map((f) => f.id))
  const normalizedQuotes = quotes.map((q) =>
    q.folderId && !folderIdSet.has(q.folderId) ? { ...q, folderId: null } : q,
  )

  if (
    candidate.schemaVersion === 2 &&
    typeof candidate.workspaceId === 'string' &&
    candidate.workspaceId.trim()
  ) {
    return {
      schemaVersion: 2,
      workspaceId: candidate.workspaceId,
      updatedAt:
        typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString(),
      quotes: normalizedQuotes,
      folders,
    }
  }
  if (candidate.schemaVersion === 1) {
    return {
      schemaVersion: 2,
      workspaceId: crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
      quotes: normalizedQuotes,
      folders,
    }
  }
  return null
}

export function exportWorkspaceJsonString(data: WorkspaceData): string {
  return `${JSON.stringify(createManifest(data), null, 2)}\n`
}

export function parseImportedWorkspaceJson(rawJson: string): WorkspaceData {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawJson)
  } catch {
    throw new Error('ملف JSON غير صالح ولا يمكن قراءته.')
  }
  const migrated = migrateWorkspace(parsed)
  if (!migrated) {
    throw new Error('بنية ملف البيانات غير متوافقة مع مخطط طِرَاس.')
  }
  return migrated
}

