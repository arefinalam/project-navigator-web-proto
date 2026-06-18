import { useEffect, useState } from 'react'

export function usePersistentState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const saved = localStorage.getItem(key)
    if (!saved) return initialValue

    try {
      const parsed = JSON.parse(saved) as T
      if (
        typeof initialValue === 'object' && initialValue !== null && !Array.isArray(initialValue) &&
        typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ) {
        return { ...initialValue, ...parsed }
      }
      return parsed
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue] as const
}
