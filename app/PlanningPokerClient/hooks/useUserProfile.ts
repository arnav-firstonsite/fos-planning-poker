import { FormEvent, useEffect, useState } from 'react'
import { postJson } from './apiClient'

/**
 * Handles:
 * - userId generation + localStorage
 * - userName state
 * - profileChecked + showProfileModal
 * - auto-join room if stored profile exists
 * - profile submit logic
 */
export function useUserProfile(roomId: string) {
  const [userId, setUserId] = useState<string>('')
  const [userName, setUserName] = useState<string>('')

  const [profileChecked, setProfileChecked] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Get or create a stable userId
    let storedId = window.localStorage.getItem('planningPokerUserId')
    if (!storedId) {
      storedId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      window.localStorage.setItem('planningPokerUserId', storedId)
    }
    setUserId(storedId)

    const storedName =
      window.localStorage.getItem('planningPokerUserName') ?? ''

    const hasStoredProfile = !!storedName

    if (storedName) setUserName(storedName)

    if (hasStoredProfile) {
      ;(async () => {
        try {
          // Auto-join room with stored profile
          await postJson('/api/upsert-participant', {
            roomId,
            userId: storedId,
            name: storedName,
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
      // No saved profile -> show modal
      setShowProfileModal(true)
      setProfileChecked(true)
    }
  }, [roomId])

  const hasUserProfile = !!userId && !!userName.trim()

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedName = userName.trim()

    if (!userId) {
      return
    }

    if (!trimmedName) {
      // Let the input's required/pattern validation handle the UI message
      return
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('planningPokerUserName', trimmedName)
    }

    try {
      await postJson('/api/upsert-participant', {
        roomId,
        userId,
        name: trimmedName,
      })
      setShowProfileModal(false)
    } catch (err) {
      console.error('[profile] failed to save profile', err)
    }
  }

  return {
    userId,
    userName,
    setUserName,
    profileChecked,
    showProfileModal,
    setShowProfileModal,
    hasUserProfile,
    handleProfileSubmit,
  }
}
