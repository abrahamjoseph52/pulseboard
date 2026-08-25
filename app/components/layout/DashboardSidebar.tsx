"use client"

import { usePathname, useRouter } from "next/navigation"

import { APP_NAME, ROUTES } from "@/lib/constants"

type NavigationItem = {
  label: string
  href: string
  icon: string
}

const adminNavigation: NavigationItem[] = [
  {
    label: "Dashboard",
    href: ROUTES.adminDashboard,
    icon: "▦",
  },
  {
    label: "Sessions",
    href: ROUTES.adminSessions,
    icon: "◉",
  },
  {
    label: "Analytics",
    href: ROUTES.adminAnalytics,
    icon: "◔",
  },
]

type DashboardSidebarProps = {
  role?: "admin" | "student"
}

export default function DashboardSidebar({
  role = "admin",
}: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const navigation =
    role === "admin"
      ? adminNavigation
      : [
          {
            label: "Home",
            href: ROUTES.studentHome,
            icon: "⌂",
          },
          {
            label: "Join Session",
            href: ROUTES.studentJoin,
            icon: "+",
          },
        ]

  return (
    <aside className="hidden min-h-screen w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b border-slate-200 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-black text-white">
          P
        </div>

        <div className="ml-3">
          <p className="font-bold tracking-tight text-slate-950">
            {APP_NAME}
          </p>

          <p className="text-xs capitalize text-slate-500">
            {role} workspace
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`)

          return (
            <button
              key={item.href}
              type="button"
              onClick={() => router.push(item.href)}
              className={[
                "flex w-full items-center gap-3 rounded-xl px-4 py-3",
                "text-sm font-semibold transition-all duration-200",
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
              ].join(" ")}
            >
              <span
                className="flex h-5 w-5 items-center justify-center text-base"
                aria-hidden="true"
              >
                {item.icon}
              </span>

              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {role} mode
          </p>

          <p className="mt-1 text-sm font-medium text-slate-600">
            Real-time learning signals
          </p>
        </div>
      </div>
    </aside>
  )
}