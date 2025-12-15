import { FormEvent, useEffect, useState } from 'react'
import { postJson } from './apiClient'

/**
 * Handles:
 * - userId generation + localStorage
 * - userName / userRole state
 * - profileChecked + showProfileModal
 * - auto-join room if stored profile exists
 * - profile submit logic
 */
export function useUserProfile(roomId: string) {
  const [userId, setUserId] = useState<string>('')
  const [userName, setUserName] = useState<string>('')
  const [userRole, setUserRole] = useState<'dev' | 'qa' | ''>('')

  const [profileChecked, setProfileChecked] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    let storedId = window.localStorage.getItem('planningPokerUserId')
    if (!storedId) {
      storedId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      window.localStorage.setItem('planningPokerUserId', storedId)
    }
    setUserId(storedId)

    const storedName = window.localStorage.getItem('planningPokerUserName') ?? ''
    const storedRole = window.localStorage.getItem('planningPokerUserRole')

    const hasStoredProfile = !!storedName && (storedRole === 'dev' || storedRole === 'qa')

    if (storedName) setUserName(storedName)
    if (storedRole === 'dev' || storedRole === 'qa') setUserRole(storedRole)

    if (hasStoredProfile) {
      ;(async () => {
        try {
          await postJson('/api/upsert-participant', {
            roomId,
            userId: storedId,
            name: storedName,
            role: storedRole,
          })
          setShowProfileModal(false)
        } catch (err) {
          console.error('[profile] failed to auto-join room', err)
          setShowProfileModal(true)
        } finally {
          setProfileChecked(true)
        }
      })()
    } else {
      setShowProfileModal(true)
      setProfileChecked(true)
    }
  }, [roomId])

  const hasUserProfile = !!userId && !!userName && (userRole === 'dev' || userRole === 'qa')

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedName = userName.trim()

    if (!userId) {
      return
    }

    if (!(userRole === 'dev' || userRole === 'qa')) {
      return
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('planningPokerUserName', trimmedName)
      window.localStorage.setItem('planningPokerUserRole', userRole)
    }

    try {
      await postJson('/api/upsert-participant', {
        roomId,
        userId,
        name: trimmedName,
        role: userRole,
      })
      setShowProfileModal(false)
    } catch (err) {
      console.error('[profile] failed to save profile', err)
    }
  }

  return {
    userId,
    userName,
    userRole,
    setUserName,
    setUserRole,
    profileChecked,
    showProfileModal,
    setShowProfileModal,
    hasUserProfile,
    handleProfileSubmit,
  }
}
