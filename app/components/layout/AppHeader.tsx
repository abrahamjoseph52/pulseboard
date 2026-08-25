"use client"

import { useRouter } from "next/navigation"

import Button from "@/app/components/ui/Button"
import { APP_NAME, ROUTES } from "@/lib/constants"
import { getInitials } from "@/lib/utils"

type AppHeaderProps = {
  name?: string
  photoURL?: string
  role?: "admin" | "student"
  onLogout?: () => void | Promise<void>
}

export default function AppHeader({
  name,
  photoURL,
  role,
  onLogout,
}: AppHeaderProps) {
  const router = useRouter()

  const handleLogoClick = () => {
    if (role === "admin") {
      router.push(ROUTES.adminDashboard)
      return
    }

    if (role === "student") {
      router.push(ROUTES.studentHome)
      return
    }

    router.push(ROUTES.home)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
      <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={handleLogoClick}
          className="flex items-center gap-3 rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-black text-white shadow-sm">
            P
          </div>

          <div>
            <p className="text-base font-bold tracking-tight text-slate-950">
              {APP_NAME}
            </p>

            <p className="text-xs text-slate-500">
              Live learning intelligence
            </p>
          </div>
        </button>

        <div className="flex items-center gap-3">
          {name && (
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-900">
                {name}
              </p>

              {role && (
                <p className="text-xs capitalize text-slate-500">
                  {role}
                </p>
              )}
            </div>
          )}

          {name && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-bold text-slate-700">
              {photoURL ? (
                <img
                  src={photoURL}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(name)
              )}
            </div>
          )}

          {onLogout && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void onLogout()}
            >
              Sign out
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}