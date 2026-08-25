"use client"

import { usePathname, useRouter } from "next/navigation"

import { ROUTES } from "@/lib/constants"

type NavigationItem = {
  label: string
  href: string
  icon: string
}

const adminNavigation: NavigationItem[] = [
  {
    label: "Home",
    href: ROUTES.adminDashboard,
    icon: "⌂",
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

type MobileNavigationProps = {
  role?: "admin" | "student"
}

export default function MobileNavigation({
  role = "admin",
}: MobileNavigationProps) {
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
            label: "Join",
            href: ROUTES.studentJoin,
            icon: "+",
          },
        ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around">
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
                "flex min-w-18 flex-col items-center gap-1 rounded-xl px-3 py-2",
                "text-xs font-semibold transition-all duration-200",
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
              ].join(" ")}
            >
              <span
                className="flex h-5 w-5 items-center justify-center text-base"
                aria-hidden="true"
              >
                {item.icon}
              </span>

              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}