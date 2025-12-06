// app/components/ProfileModal.tsx

import type { FormEvent } from "react";

type ProfileModalProps = {
  name: string;
  role: "dev" | "qa" | "";
  onNameChange: (name: string) => void;
  onRoleChange: (role: "dev" | "qa") => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ProfileModal({
  name,
  role,
  onNameChange,
  onRoleChange,
  onSubmit,
}: ProfileModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Welcome</h2>
        <p className="mb-4 text-sm text-gray-600">
          Please enter your name and role so we can attach your votes.
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
            />
          </div>
          <div className="text-left">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Role
            </span>
            <div className="flex gap-3">
              <label className="flex items-center gap-1 text-sm text-gray-700">
                <input
                  type="radio"
                  name="role"
                  value="dev"
                  checked={role === "dev"}
                  onChange={() => onRoleChange("dev")}
                  className="h-4 w-4"
                  required
                />
                Dev
              </label>
              <label className="flex items-center gap-1 text-sm text-gray-700">
                <input
                  type="radio"
                  name="role"
                  value="qa"
                  checked={role === "qa"}
                  onChange={() => onRoleChange("qa")}
                  className="h-4 w-4"
                />
                QA
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              className="rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-dark-blue focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}