"use client"

import {
  Moon,
  Sparkles,
  Sun,
} from "lucide-react"

import {
  useState,
} from "react"

type Theme =
  | "dark"
  | "light"

const STORAGE_KEY =
  "pulse-theme"

function getStoredTheme(): Theme {
  if (
    typeof window ===
    "undefined"
  ) {
    return "dark"
  }

  const stored =
    window.localStorage.getItem(
      STORAGE_KEY
    )

  return stored ===
    "light"
    ? "light"
    : "dark"
}

export default function ThemeToggle() {
  const [theme, setTheme] =
    useState<Theme>(
      getStoredTheme
    )

  const toggleTheme =
    () => {
      const nextTheme: Theme =
        theme === "dark"
          ? "light"
          : "dark"

      document.documentElement.dataset.theme =
        nextTheme

      window.localStorage.setItem(
        STORAGE_KEY,
        nextTheme
      )

      setTheme(
        nextTheme
      )
    }

  const isDark =
    theme === "dark"

  return (
    <button
      type="button"
      onClick={
        toggleTheme
      }
      aria-label={
        isDark
          ? "Switch to light theme"
          : "Switch to dark theme"
      }
      title={
        isDark
          ? "Switch to light theme"
          : "Switch to dark theme"
      }
      className={[
        "group relative flex h-11 w-11 items-center justify-center",
        "overflow-hidden rounded-xl",
        "border border-(--border)",
        "bg-(--surface)",
        "text-(--foreground-secondary)",
        "shadow-(--shadow-xs)",
        "transition-all duration-200 ease-out",
        "hover:-translate-y-0.5",
        "hover:border-(--border-strong)",
        "hover:bg-(--surface-hover)",
        "hover:text-(--foreground)",
        "hover:shadow-(--shadow-sm)",
        "active:translate-y-0",
        "active:scale-[0.96]",
        "focus:outline-none",
        "focus-visible:ring-2",
        "focus-visible:ring-violet-400/60",
        "focus-visible:ring-offset-2",
        "focus-visible:ring-offset-(--background)",
      ].join(" ")}
    >
      {/* Ambient hover glow */}
      <span
        aria-hidden="true"
        className={[
          "pointer-events-none absolute inset-0",
          "opacity-0 transition-opacity duration-300",
          "group-hover:opacity-100",
          isDark
            ? "bg-amber-400/10"
            : "bg-violet-500/10",
        ].join(" ")}
      />

      {/* Rotating ring */}
      <span
        aria-hidden="true"
        className={[
          "pointer-events-none absolute",
          "h-20 w-20 rounded-full",
          "border border-transparent",
          "transition-transform duration-500",
          "group-hover:rotate-180",
          isDark
            ? "border-t-amber-400/20"
            : "border-t-violet-400/20",
        ].join(" ")}
      />

      {/* Theme icon */}
      <span
        className={[
          "relative z-10 flex h-6 w-6 items-center justify-center",
          "transition-all duration-300",
          "group-hover:scale-110",
          isDark
            ? "text-amber-300"
            : "text-violet-300",
        ].join(" ")}
      >
        {isDark ? (
          <Sun
            className="h-5 w-5 transition-transform duration-500 group-hover:rotate-45"
          />
        ) : (
          <Moon
            className="h-5 w-5 transition-transform duration-500 group-hover:-rotate-12"
          />
        )}
      </span>

      {/* Tiny sparkle */}
      <Sparkles
        aria-hidden="true"
        className={[
          "pointer-events-none absolute bottom-1 right-1 h-2.5 w-2.5",
          "opacity-0 transition-all duration-300",
          "group-hover:opacity-70",
          isDark
            ? "text-amber-300"
            : "text-violet-300",
        ].join(" ")}
      />
    </button>
  )
}