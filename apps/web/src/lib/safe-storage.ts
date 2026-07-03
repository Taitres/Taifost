/**
 * Safe `atomWithStorage` wrapper that gracefully handles environments
 * where `localStorage` is blocked (e.g. Safari/Brave Tracking Prevention,
 * third-party iframe contexts, incognito mode in some browsers).
 *
 * Falls back to an in-memory map when storage access is denied.
 */

import { atomWithStorage } from 'jotai/utils'

function isStorageAvailable(): boolean {
  try {
    const key = '__storage_test__'
    localStorage.setItem(key, '1')
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

const storageAvailable = isStorageAvailable()

const memoryStorage = new Map<string, string>()

const safeStorage: Storage = {
  getItem(key: string): string | null {
    if (storageAvailable) {
      try {
        return localStorage.getItem(key)
      } catch {
        // fall through to memory fallback
      }
    }
    return memoryStorage.get(key) ?? null
  },

  setItem(key: string, value: string): void {
    if (storageAvailable) {
      try {
        localStorage.setItem(key, value)
        return
      } catch {
        // fall through to memory fallback
      }
    }
    memoryStorage.set(key, value)
  },

  removeItem(key: string): void {
    if (storageAvailable) {
      try {
        localStorage.removeItem(key)
        return
      } catch {
        // fall through to memory fallback
      }
    }
    memoryStorage.delete(key)
  },

  get length(): number {
    if (storageAvailable) {
      try {
        return localStorage.length
      } catch {
        // fall through
      }
    }
    return memoryStorage.size
  },

  clear(): void {
    if (storageAvailable) {
      try {
        localStorage.clear()
        return
      } catch {
        // fall through
      }
    }
    memoryStorage.clear()
  },

  key(index: number): string | null {
    if (storageAvailable) {
      try {
        return localStorage.key(index)
      } catch {
        // fall through
      }
    }
    return [...memoryStorage.keys()][index] ?? null
  },
}

export function atomWithSafeStorage<T>(key: string, initialValue: T) {
  return atomWithStorage<T>(key, initialValue, safeStorage)
}
