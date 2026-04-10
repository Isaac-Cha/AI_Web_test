import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface QueryOptions {
  tableName: string
  select?: string
  filter?: (query: any) => any // eslint-disable-line @typescript-eslint/no-explicit-any
  cacheTime?: number // 本地缓存时间，默认 1 小时 (3600000ms)
}

// 通用的带本地缓存的 Supabase 查询 Hook
export function useSupabaseQuery<T>(options: QueryOptions) {
  const [data, setData] = useState<T[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cacheKey = `sb-cache-${options.tableName}-${options.select || '*'}`

  useEffect(() => {
    let isMounted = true
    const cacheTime = options.cacheTime ?? 3600000

    async function fetchData() {
      try {
        setLoading(true)

        // 尝试读本地缓存
        const cachedStr = localStorage.getItem(cacheKey)
        if (cachedStr) {
          const cached = JSON.parse(cachedStr)
          if (Date.now() - cached.timestamp < cacheTime) {
            if (isMounted) {
              setData(cached.data)
              setLoading(false)
            }
            return // 缓存有效直接返回，不调接口
          }
        }

        // 发起请求
        let query = supabase.from(options.tableName).select(options.select || '*')
        if (options.filter) {
          query = options.filter(query)
        }

        const { data: result, error: fetchError } = await query

        if (fetchError) throw fetchError

        if (isMounted) {
          setData(result as T[])
          // 写入缓存
          localStorage.setItem(
            cacheKey,
            JSON.stringify({ timestamp: Date.now(), data: result })
          )
        }
      } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (isMounted) {
          console.error(`Error fetching ${options.tableName}:`, err)
          setError(err.message || 'Fetch failed')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [options.tableName, options.select, cacheKey]) // 注意：filter 不建议放进来，容易触发死循环，调用时尽量用 useCallback

  return { data, loading, error }
}
