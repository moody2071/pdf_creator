export interface MemoryDirectoryControl {
  handle: FileSystemDirectoryHandle
  setPermission: (state: PermissionState) => void
  setFailWrites: (fail: boolean) => void
  getFileText: (path: string) => string | undefined
  setFileText: (path: string, content: string) => void
  deletePath: (path: string) => void
  listAllPaths: () => string[]
}

export function createMemoryDirectoryHandle(
  name = 'مجلد-طِرَاس-المحلي',
  initialFiles: Record<string, string> = {},
): MemoryDirectoryControl {
  let permissionState: PermissionState = 'granted'
  let failWrites = false
  const files = new Map<string, string>(Object.entries(initialFiles))
  const directories = new Set<string>([''])

  for (const filePath of Object.keys(initialFiles)) {
    const parts = filePath.split('/')
    if (parts.length > 1) {
      directories.add(parts.slice(0, -1).join('/'))
    }
  }

  const normalizePrefix = (prefix: string) => (prefix ? `${prefix}/` : '')

  const makeFileHandle = (fullPath: string, fileName: string): FileSystemFileHandle => {
    const handle = {
      kind: 'file' as const,
      name: fileName,
      isSameEntry: async (other: FileSystemHandle) =>
        other.kind === 'file' && other.name === fileName,
      getFile: async () => {
        const content = files.get(fullPath) ?? ''
        return new File([content], fileName, { type: 'application/json' })
      },
      createWritable: async () => {
        if (failWrites) {
          throw new Error('فشل كتابة الملف على القرص')
        }
        let staged = files.get(fullPath) ?? ''
        let aborted = false
        return {
          write: async (chunk: unknown) => {
            if (failWrites) {
              throw new Error('فشل كتابة الملف أثناء النقل')
            }
            staged = typeof chunk === 'string' ? chunk : String(chunk)
          },
          close: async () => {
            if (failWrites) {
              throw new Error('فشل إغلاق الملف بعد الكتابة')
            }
            if (!aborted) {
              files.set(fullPath, staged)
            }
          },
          abort: async () => {
            aborted = true
          },
        } as unknown as FileSystemWritableFileStream
      },
    }
    return handle as unknown as FileSystemFileHandle
  }

  const makeDirHandle = (dirPath: string, dirName: string): FileSystemDirectoryHandle => {
    const prefix = normalizePrefix(dirPath)
    const dirHandle = {
      kind: 'directory' as const,
      name: dirName,
      isSameEntry: async (other: FileSystemHandle) =>
        other.kind === 'directory' && other.name === dirName,
      queryPermission: async () => permissionState,
      requestPermission: async () => {
        if (permissionState === 'prompt') {
          permissionState = 'granted'
        }
        return permissionState
      },
      getFileHandle: async (childName: string, options?: { create?: boolean }) => {
        const fullPath = `${prefix}${childName}`
        if (!files.has(fullPath)) {
          if (options?.create) {
            if (failWrites) throw new Error('تعذر إنشاء الملف على القرص')
            files.set(fullPath, '')
          } else {
            throw new Error(`الملف غير موجود: ${fullPath}`)
          }
        }
        return makeFileHandle(fullPath, childName)
      },
      getDirectoryHandle: async (childDir: string, options?: { create?: boolean }) => {
        const subPath = `${prefix}${childDir}`
        if (!directories.has(subPath)) {
          if (options?.create) {
            directories.add(subPath)
          } else {
            throw new Error(`المجلد الفرعي غير موجود: ${subPath}`)
          }
        }
        return makeDirHandle(subPath, childDir)
      },
      removeEntry: async (childName: string) => {
        if (failWrites) throw new Error('تعذر حذف الملف')
        const fullPath = `${prefix}${childName}`
        if (files.has(fullPath)) {
          files.delete(fullPath)
          return
        }
        if (directories.has(fullPath)) {
          directories.delete(fullPath)
          for (const key of [...files.keys()]) {
            if (key.startsWith(`${fullPath}/`)) files.delete(key)
          }
          return
        }
        throw new Error(`العنصر غير موجود: ${fullPath}`)
      },
      entries: async function* () {
        for (const subDir of directories) {
          if (subDir && subDir.startsWith(prefix)) {
            const rest = subDir.slice(prefix.length)
            if (rest && !rest.includes('/')) {
              yield [rest, makeDirHandle(subDir, rest)] as [string, FileSystemHandle]
            }
          }
        }
        for (const filePath of files.keys()) {
          if (filePath.startsWith(prefix)) {
            const rest = filePath.slice(prefix.length)
            if (rest && !rest.includes('/')) {
              yield [rest, makeFileHandle(filePath, rest)] as [string, FileSystemHandle]
            }
          }
        }
      },
      values: async function* () {
        for await (const [, entry] of dirHandle.entries()) {
          yield entry
        }
      },
    }
    return dirHandle as unknown as FileSystemDirectoryHandle
  }

  return {
    handle: makeDirHandle('', name),
    setPermission: (state: PermissionState) => {
      permissionState = state
    },
    setFailWrites: (fail: boolean) => {
      failWrites = fail
    },
    getFileText: (path: string) => files.get(path),
    setFileText: (path: string, content: string) => {
      const parts = path.split('/')
      if (parts.length > 1) directories.add(parts.slice(0, -1).join('/'))
      files.set(path, content)
    },
    deletePath: (path: string) => {
      files.delete(path)
    },
    listAllPaths: () => [...files.keys()].sort(),
  }
}

