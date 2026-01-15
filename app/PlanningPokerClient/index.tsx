// app/PlanningPokerClient/index.tsx
'use client'

import { useSession } from './hooks/useSession'
import { useUserProfile } from './hooks/useUserProfile'
import { PlanningPokerHeader } from './components/PlanningPokerHeader'
import { VoteControls } from './components/VoteControls'
import { Charts } from './components/Charts'
import { ParticipantsTable } from './components/ParticipantsTable'
import { SessionActions } from './components/SessionActions'
import { ProfileModal } from './components/ProfileModal'

const ROOM_ID = '000'

export function PlanningPokerClient() {
  const {
    userId,
    userName,
    setUserName,
    profileChecked,
    showProfileModal,
    setShowProfileModal,
    hasUserProfile,
    handleProfileSubmit,
  } = useUserProfile(ROOM_ID)

  const {
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
  } = useSession(ROOM_ID, userId, hasUserProfile, userName)

  const showConnectionBanner =
    isOffline ||
    (connectionStatus !== 'open' && connectionStatus !== 'idle')

  const connectionMessage = (() => {
    if (isOffline) {
      return 'Offline: changes may not sync. Check the network connection.'
    }

    if (connectionStatus === 'connecting') {
      return 'Connecting to server…'
    }
    if (connectionStatus === 'reconnecting') {
      return 'Disconnected from server. Attempting to reconnect…'
    }
    if (connectionStatus === 'error') {
      return 'Connection error. Attempting to reconnect…'
    }

    return null
  })()

  return (
    <div className="min-h-screen flex flex-col items-center bg-light-grey font-sans">
      <PlanningPokerHeader onChangeProfile={() => setShowProfileModal(true)} />

      <main className="flex w-full max-w-3xl flex-1 flex-col items-center justify-start px-4 pt-10 pb-4 md:justify-center md:px-6 md:py-16 md:-mt-6">
        <div className="flex flex-col items-center gap-6 text-center">
          {showConnectionBanner && connectionMessage && (
            <div className="w-full rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {connectionMessage}
            </div>
          )}

          <div className="w-full max-w-3xl rounded-xl border border-gray-200 bg-white shadow-sm">
            <VoteControls
              selectedVote={currentUser?.vote ?? null}
              disabled={!hasUserProfile}
              onVoteClick={submitVote}
            />

            <Charts session={session} />

            <ParticipantsTable
              currentUserId={userId}
              participants={session.participants}
              isRevealed={isRevealed}
            />

            <SessionActions
              isRevealed={isRevealed}
              canReveal={hasAnyVote && !isWorking}
              canReset={!isWorking}
              onReveal={reveal}
              onReset={reset}
            />
          </div>
        </div>
      </main>

      {profileChecked && showProfileModal && (
        <ProfileModal
          name={userName}
          onNameChange={setUserName}
          onSubmit={handleProfileSubmit}
          onCancel={() => setShowProfileModal(false)}
        />
      )}
    </div>
  )
}