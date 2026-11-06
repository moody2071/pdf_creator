import { QUOTE_STATUSES, type QuoteStatus } from '../domain/quote'

export type Screen = 'library' | 'templates' | 'editor' | 'template-designer'
export type WorkspaceMode = 'browser' | 'folder' | 'reconnect' | 'memory'
export type SaveState = 'saved' | 'saving' | 'pending-reconnect' | 'write-error'

export type DialogConfig =
  | {
      type: 'confirm'
      title: string
      message?: string
      confirmText?: string
      cancelText?: string
      isDanger?: boolean
      icon?: 'danger' | 'folder' | 'info'
      onConfirm: () => void
    }
  | {
      type: 'prompt'
      title: string
      message?: string
      defaultValue?: string
      placeholder?: string
      confirmText?: string
      cancelText?: string
      icon?: 'folder' | 'info'
      onConfirm: (value: string) => void
    }

export const statuses: Array<'الكل' | QuoteStatus> = ['الكل', ...QUOTE_STATUSES]

export const FOLDER_COLORS = [
  '#007aff',
  '#34c759',
  '#ff9500',
  '#af52de',
  '#5856d6',
  '#ff2d55',
  '#5ac8fa',
  '#8e8e93',
]

export function getExecutivePalette(accent: string): {
  primary: string
  secondary: string
  bannerGradient: string
  softTint: string
} {
  const normalized = (accent || '#243f5b').toLowerCase()
  if (normalized === '#315c50' || normalized === '#14532d') {
    return {
      primary: '#144538',
      secondary: '#b88238',
      bannerGradient: 'linear-gradient(135deg, #164e3f 0%, #0e3128 100%)',
      softTint: 'rgba(20, 69, 56, 0.06)',
    }
  }
  if (normalized === '#34c759') {
    return {
      primary: '#155e3b',
      secondary: '#10b981',
      bannerGradient: 'linear-gradient(135deg, #16653f 0%, #0f462b 100%)',
      softTint: 'rgba(21, 94, 59, 0.06)',
    }
  }
  if (normalized === '#8e6742') {
    return {
      primary: '#4a321c',
      secondary: '#c89656',
      bannerGradient: 'linear-gradient(135deg, #563a21 0%, #362312 100%)',
      softTint: 'rgba(142, 103, 66, 0.07)',
    }
  }
  if (normalized === '#ff9500') {
    return {
      primary: '#6b3410',
      secondary: '#f59e0b',
      bannerGradient: 'linear-gradient(135deg, #7c3a12 0%, #4d2208 100%)',
      softTint: 'rgba(245, 158, 11, 0.07)',
    }
  }
  if (normalized === '#af52de') {
    return {
      primary: '#3d1e61',
      secondary: '#c68b3e',
      bannerGradient: 'linear-gradient(135deg, #482373 0%, #2b1347 100%)',
      softTint: 'rgba(61, 30, 97, 0.06)',
    }
  }
  if (normalized === '#007aff' || normalized === '#0071e3') {
    return {
      primary: '#183b66',
      secondary: '#0284c7',
      bannerGradient: 'linear-gradient(135deg, #1c4578 0%, #102a4c 100%)',
      softTint: 'rgba(2, 132, 199, 0.06)',
    }
  }
  return {
    primary: '#1e3a5f',
    secondary: '#9a6b3b',
    bannerGradient: 'linear-gradient(135deg, #214069 0%, #152945 100%)',
    softTint: 'rgba(30, 58, 95, 0.05)',
  }
}

