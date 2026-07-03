/**
 * Safe `atomWithStorage` wrapper that gracefully handles environments
 * where `localStorage` is blocked (e.g. Safari/Brave Tracking Prevention,
 * third-party iframe contexts, incognito mode in some browsers).
 *
 * Falls back to an in-memory map when storage access is denied.
 */

import { atomWithStorage } from 'jotai/utils'

interface SyncStorage<T> {
  getItem(key: string): T
  setItem(key: string, value: T): void
  removeItem(key: string): void
  clear(): void
  key(index: number): string | null
  get length(): number
}

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

function createSafeStorage<T>(initialValue: T): SyncStorage<T> {
  return {
    getItem(key: string): T {
      if (storageAvailable) {
        try {
          const value = localStorage.getItem(key)
          if (value !== null) {
            return JSON.parse(value) as T
          }
        } catch {
          // fall through to memory fallback
        }
      }
      const value = memoryStorage.get(key)
      return value !== undefined ? (JSON.parse(value) as T) : initialValue
    },

    setItem(key: string, value: T): void {
      const serialized = JSON.stringify(value)
      if (storageAvailable) {
        try {
          localStorage.setItem(key, serialized)
          return
        } catch {
          // fall through to memory fallback
        }
      }
      memoryStorage.set(key, serialized)
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
}

export function atomWithSafeStorage<T>(key: string, initialValue: T) {
  return atomWithStorage<T>(
    key,
    initialValue,
    createSafeStorage<T>(initialValue),
  )
}
