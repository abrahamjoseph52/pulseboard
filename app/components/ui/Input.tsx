"use client"

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
} from "react"

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  hint?: string
  fullWidth?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      label,
      error,
      hint,
      fullWidth = true,
      className = "",
      id,
      disabled,
      ...props
    },
    ref
  ) {
    const generatedId = useId()
    const inputId = id ?? generatedId

    return (
      <div className={fullWidth ? "w-full" : ""}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            {label}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={[
            "h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-900",
            "outline-none transition-all duration-200",
            "placeholder:text-slate-400",
            "focus:ring-4",
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-100"
              : "border-slate-200 focus:border-slate-900 focus:ring-slate-100",
            "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error
              ? `${inputId}-error`
              : hint
                ? `${inputId}-hint`
                : undefined
          }
          {...props}
        />

        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-2 text-xs font-medium text-red-600"
          >
            {error}
          </p>
        )}

        {!error && hint && (
          <p
            id={`${inputId}-hint`}
            className="mt-2 text-xs text-slate-500"
          >
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = "Input"

export default Input