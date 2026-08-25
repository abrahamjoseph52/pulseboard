"use client"

import { useState } from "react"

import Button from "@/app/components/ui/Button"
import Card from "@/app/components/ui/Card"

type JoinSessionFormProps = {
  onJoin: (joinCode: string) => Promise<void> | void
  loading?: boolean
  error?: string | null
}

export default function JoinSessionForm({
  onJoin,
  loading = false,
  error = null,
}: JoinSessionFormProps) {
  const [joinCode, setJoinCode] = useState("")

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    const code = joinCode.trim().toUpperCase()

    if (!code || loading) return

    await onJoin(code)
  }

  return (
    <Card className="w-full">
      <div className="mb-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
          📡
        </div>

        <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-950">
          Join a live session
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Enter the session code shared by your lecturer to start
          sending live learning signals.
        </p>
      </div>

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="space-y-4"
      >
        <div>
          <label
            htmlFor="joinCode"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Session code
          </label>

          <input
            id="joinCode"
            type="text"
            value={joinCode}
            onChange={(event) =>
              setJoinCode(event.target.value.toUpperCase())
            }
            placeholder="ENTER CODE"
            maxLength={12}
            autoComplete="off"
            disabled={loading}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center font-mono text-lg font-bold tracking-[0.2em] text-slate-950 outline-none transition placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-sm font-medium text-red-600">
              {error}
            </p>
          </div>
        )}

        <Button
          type="submit"
          fullWidth
          loading={loading}
          disabled={!joinCode.trim()}
        >
          Join Session →
        </Button>
      </form>

      <p className="mt-5 text-center text-xs leading-5 text-slate-400">
        Your responses are used to help your lecturer understand the
        classroom better.
      </p>
    </Card>
  )
}