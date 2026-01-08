// app/PlanningPokerClient/components/ProfileModal.tsx

import type { FormEvent } from 'react'

type ProfileModalProps = {
  name: string
  onNameChange: (name: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCancel: () => void
}

export function ProfileModal({
  name,
  onNameChange,
  onSubmit,
  onCancel,
}: ProfileModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Welcome</h2>
        <p className="mb-4 text-sm text-gray-600">
          Please enter a name so votes can be attached.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="text-left">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              maxLength={50}
              pattern=".*\S.*"
              title="Name cannot be blank or only spaces"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Your name"
              required
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-dark-blue hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}