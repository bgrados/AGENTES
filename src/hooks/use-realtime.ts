"use client"

import { useEffect, useCallback } from "react"
import { useSupabase } from "@/providers/supabase-provider"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

type RealtimeCallback<T extends Record<string, unknown>> = (payload: RealtimePostgresChangesPayload<T>) => void

export function useRealtime<T extends Record<string, unknown> = Record<string, unknown>>(
  table: string,
  filter?: string,
  callback?: RealtimeCallback<T>,
) {
  const { supabase } = useSupabase()

  const subscribe = useCallback(() => {
    const channelName = `realtime-${table}-${filter || "all"}`

    const channel = supabase
      .channel(channelName)
      .on<T>(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: filter,
        },
        (payload) => {
          callback?.(payload)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, table, filter, callback])

  useEffect(() => {
    const unsubscribe = subscribe()
    return unsubscribe
  }, [subscribe])

  return { subscribe }
}
