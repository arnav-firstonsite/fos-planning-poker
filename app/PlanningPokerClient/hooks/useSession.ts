import { useEffect, useRef, useState } from 'react'
import { Vote, SessionData } from '../../planningPokerShared'
import { postJson } from './apiClient'

type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'open'
  | 'reconnecting'
  | 'error'

/**
 * Handles:
 * - WebSocket connection and liveSession
 * - derived session data (isRevealed, hasAnyVote, currentUser)
 * - vote / reveal / reset mutations
 * - connectionStatus + simple reconnection
 * - optional browser online/offline awareness
 * - re-upserting the participant into the in-memory store on (re)connect
 */
export function useSession(
  roomId: string,
  userId: string,
  hasUserProfile: boolean,
  userName: string,
) {
  const [liveSession, setLiveSession] = useState<SessionData | null>(null)
  const [isWorking, setIsWorking] = useState(false)
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('idle')
  const [isOffline, setIsOffline] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return !window.navigator.onLine
  })

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)

  // Refs to always have the latest profile info inside ws event handlers
  const userNameRef = useRef(userName)
  const hasProfileRef = useRef(hasUserProfile)

  useEffect(() => {
    userNameRef.current = userName
  }, [userName])

  useEffect(() => {
    hasProfileRef.current = hasUserProfile
  }, [hasUserProfile])

  // Basic browser online/offline tracking
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      setIsOffline(false)
    }

    const handleOffline = () => {
      setIsOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // WebSocket: subscribe to session updates with simple reconnection
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!userId) return

    let isUnmounted = false

    const clearReconnectTimeout = () => {
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }

    const connect = () => {
      if (isUnmounted) return

      setConnectionStatus((prev) =>
        prev === 'idle' ? 'connecting' : 'reconnecting',
      )

      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const wsUrl = `${protocol}://${window.location.host}/ws`

      // Always create a fresh socket; this app doesn't need dedup complexity
      if (wsRef.current) {
        try {
          wsRef.current.close()
        } catch {
          // ignore
        }
        wsRef.current = null
      }

      let ws: WebSocket
      try {
        ws = new WebSocket(wsUrl)
      } catch (err) {
        if (isUnmounted) return
        console.error('[ws] failed to construct WebSocket', err)
        setConnectionStatus('error')

        clearReconnectTimeout()
        reconnectTimeoutRef.current = window.setTimeout(connect, 2000)
        return
      }

      wsRef.current = ws

      ws.onopen = () => {
        if (isUnmounted) return

        setConnectionStatus('open')
        setIsOffline(false)

        // Always (re)join the room
        ws.send(JSON.stringify({ type: 'join', roomId, userId }))

        // Re-upsert participant into in-memory store on every successful open.
        // This covers both initial connect *and* reconnects.
        const latestName = userNameRef.current?.trim?.() ?? ''
        const hasProfileNow = hasProfileRef.current

        if (hasProfileNow && latestName) {
          ;(async () => {
            try {
              await postJson('/api/upsert-participant', {
                roomId,
                userId,
                name: latestName,
              })
            } catch (err) {
              console.error(
                '[session] failed to upsert participant on ws open',
                err,
              )
            }
          })()
        }
      }

      ws.onmessage = (event) => {
        if (isUnmounted) return

        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'session' && msg.roomId === roomId) {
            setLiveSession(msg.session as SessionData)
          }
        } catch (err) {
          console.error('[ws] bad message', err, { raw: event.data })
        }
      }

      ws.onerror = (event) => {
        if (isUnmounted) return
        console.error('[ws] socket error', event)
        setConnectionStatus('error')
      }

      ws.onclose = () => {
        if (isUnmounted) return

        // If already offline, let the offline flag drive the message;
        // we'll still try reconnecting at a light interval.
        if (window.navigator.onLine) {
          setConnectionStatus('reconnecting')
        }

        clearReconnectTimeout()
        reconnectTimeoutRef.current = window.setTimeout(connect, 2000)
      }
    }

    connect()

    return () => {
      isUnmounted = true
      if (typeof window !== 'undefined') {
        if (reconnectTimeoutRef.current !== null) {
          window.clearTimeout(reconnectTimeoutRef.current)
        }
      }
      reconnectTimeoutRef.current = null

      if (wsRef.current) {
        try {
          wsRef.current.close()
        } catch {
          // ignore
        }
        wsRef.current = null
      }
    }
  }, [roomId, userId])

  const session: SessionData = liveSession ?? {
    participants: [],
    storyStatus: 'pending',
  }

  const isRevealed = session.storyStatus === 'revealed'
  const hasAnyVote = session.participants.some((p) => p.vote !== null)

  const currentUser = session.participants.find((p) => p.id === userId) ?? null

  const submitVote = async (vote: Vote) => {
    if (!hasUserProfile || !userId) return

    const currentVote: Vote | null = currentUser?.vote ?? null
    const newVote: Vote | null = currentVote === vote ? null : vote

    try {
      await postJson('/api/submit-vote', {
        roomId,
        userId,
        vote: newVote,
      })
    } catch (err) {
      console.error('[vote] failed to submit vote', err)
    }
  }

  const reveal = async () => {
    setIsWorking(true)
    try {
      await postJson('/api/reveal', { roomId })
    } catch (err) {
      console.error('[reveal] failed to reveal votes', err)
    } finally {
      setIsWorking(false)
    }
  }

  const reset = async () => {
    setIsWorking(true)
    try {
      await postJson('/api/reset', { roomId })
    } catch (err) {
      console.error('[reset] failed to reset votes', err)
    } finally {
      setIsWorking(false)
    }
  }

  return {
    session,
    isRevealed,
    hasAnyVote,
    currentUser,
    isWorking,
    submitVote,
    reveal,
    reset,
    connectionStatus,
    isOffline,
  }
}