import { useEffect, useState } from 'react'

function mergePersisted<T>(initialValue: T, savedValue: unknown): T {
  if (Array.isArray(initialValue)) return (Array.isArray(savedValue) ? savedValue : initialValue) as T
  if (typeof initialValue !== 'object' || initialValue === null || typeof savedValue !== 'object' || savedValue === null) {
    return (savedValue ?? initialValue) as T
  }
  const savedRecord = savedValue as Record<string, unknown>
  return Object.fromEntries(Object.entries(initialValue as Record<string, unknown>).map(([key, value]) => [
    key,
    key in savedRecord ? mergePersisted(value, savedRecord[key]) : value,
  ]).concat(Object.entries(savedRecord).filter(([key]) => !(key in (initialValue as Record<string, unknown>))))) as T
}

export function usePersistentState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const saved = localStorage.getItem(key)
    if (!saved) return initialValue

    try {
      return mergePersisted(initialValue, JSON.parse(saved))
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue] as const
}
